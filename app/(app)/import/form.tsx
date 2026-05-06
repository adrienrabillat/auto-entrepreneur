"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { formatEUR } from "@/lib/format";
import { Check, Loader2, Save, Info } from "lucide-react";

type ActivityKind = "vente" | "service_bic" | "liberal_bnc" | "mixte";
type LeafKind = "vente" | "service_bic" | "liberal_bnc"; // pas de mixte stocké
type Frequency = "monthly" | "quarterly";

type Period = { month: number; label: string };
type ExistingEntry = {
  period_year: number;
  period_month: number;
  activity_kind: string;
  amount_cents: number;
  already_declared?: boolean | null;
  submitted_at?: string | null;
};

/**
 * Pour une activité simple (vente / service_bic / liberal_bnc), on n'a
 * qu'UNE colonne d'input par période. Pour mixte, on en a TROIS, ce qui
 * permet à l'AE de ventiler son CA entre les catégories qu'il pratique.
 */
const COLUMNS_BY_ACTIVITY: Record<ActivityKind, { id: LeafKind; label: string }[]> = {
  vente: [{ id: "vente", label: "Vente" }],
  service_bic: [{ id: "service_bic", label: "Service BIC" }],
  liberal_bnc: [{ id: "liberal_bnc", label: "Libéral BNC" }],
  mixte: [
    { id: "vente", label: "Vente" },
    { id: "service_bic", label: "Service BIC" },
    { id: "liberal_bnc", label: "Libéral BNC" },
  ],
};

/**
 * Form client de l'assistant d'import.
 *
 * - Affiche une grille (lignes = périodes passées, colonnes = catégories
 *   d'activité selon le profil).
 * - Saisie en euros (string) → converti en centimes au submit.
 * - Pré-rempli avec les valeurs déjà saisies (si l'user revient).
 * - Submit : upsert toutes les lignes en une fois (insert ... on conflict
 *   do update via le client supabase) puis flag prior_activity_resolved.
 *
 * Pas de validation lourde : un montant vide vaut 0 (pas d'écriture). Pas
 * de format de saisie particulier : on accepte "1234", "1234.50", "1 234,50".
 */
export function ImportRevenueForm({
  year,
  availableYears,
  activityKind,
  frequency,
  periods,
  existing,
  alreadyResolved,
}: {
  year: number;
  /** Années sélectionnables (current → current-4). Permet à l'AE de
   *  basculer entre années pour saisir/modifier des périodes passées. */
  availableYears: number[];
  activityKind: ActivityKind;
  frequency: Frequency;
  periods: Period[];
  existing: ExistingEntry[];
  alreadyResolved: boolean;
}) {
  const router = useRouter();
  const columns = COLUMNS_BY_ACTIVITY[activityKind];

  // État : map de "month-kind" → string saisie. On stocke en string pour
  // garder la maîtrise de l'affichage (champ vide vs "0").
  const initial = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of existing) {
      m.set(`${e.period_month}-${e.activity_kind}`, centsToInputStr(e.amount_cents));
    }
    return m;
  }, [existing]);

  // État : flag "déjà déclaré à l'URSSAF" par période.
  // Un toggle par mois/trimestre (pas par cellule) — en pratique l'AE déclare
  // une période entière à la fois, pas une catégorie spécifique. Si toutes
  // les lignes de cette période sont already_declared en BD, on coche.
  const initialAlreadyDeclared = useMemo(() => {
    const byPeriod = new Map<number, { total: number; declared: number; locked: boolean }>();
    for (const e of existing) {
      const slot = byPeriod.get(e.period_month) ?? { total: 0, declared: 0, locked: false };
      slot.total += 1;
      if (e.already_declared) slot.declared += 1;
      // Si une ligne a déjà été soumise via Asthia (submitted_at non null),
      // la période est "verrouillée" : on ne peut plus changer le flag car
      // ça créerait une incohérence avec la déclaration mensuelle déjà
      // envoyée à l'URSSAF.
      if (e.submitted_at) slot.locked = true;
      byPeriod.set(e.period_month, slot);
    }
    const m = new Map<number, { checked: boolean; locked: boolean }>();
    for (const [month, s] of byPeriod) {
      m.set(month, { checked: s.declared > 0 && s.declared === s.total, locked: s.locked });
    }
    return m;
  }, [existing]);

  const [values, setValues] = useState<Map<string, string>>(initial);
  const [alreadyDeclared, setAlreadyDeclared] = useState<Map<number, { checked: boolean; locked: boolean }>>(initialAlreadyDeclared);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPeriodDeclared(month: number, checked: boolean) {
    setAlreadyDeclared((prev) => {
      const next = new Map(prev);
      const current = next.get(month);
      // Verrouillé si au moins une ligne de cette période a déjà été
      // soumise par Asthia (submitted_at non null). Bouton inerte.
      if (current?.locked) return next;
      next.set(month, { checked, locked: false });
      return next;
    });
  }

  function setCell(month: number, kind: LeafKind, raw: string) {
    setValues((prev) => {
      const next = new Map(prev);
      next.set(`${month}-${kind}`, raw);
      return next;
    });
  }

  // Total live affiché en bas de tableau, par catégorie + global.
  const totals = useMemo(() => {
    const byKind: Record<LeafKind, number> = { vente: 0, service_bic: 0, liberal_bnc: 0 };
    let grand = 0;
    for (const p of periods) {
      for (const c of columns) {
        const cents = parseToCents(values.get(`${p.month}-${c.id}`) ?? "");
        byKind[c.id] += cents;
        grand += cents;
      }
    }
    return { byKind, grand };
  }, [values, periods, columns]);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée — reconnecte-toi.");

      // Construction du payload : une ligne par cellule non-vide ou ré-écrite.
      // On envoie aussi les zéros explicites (pour pouvoir "annuler" une
      // saisie précédente en mettant 0).
      const rows: {
        user_id: string;
        period_year: number;
        period_month: number;
        activity_kind: LeafKind;
        amount_cents: number;
        already_declared: boolean;
      }[] = [];
      for (const p of periods) {
        const declaredFlag = alreadyDeclared.get(p.month)?.checked ?? false;
        for (const c of columns) {
          const raw = values.get(`${p.month}-${c.id}`) ?? "";
          // Champ vraiment vide = on ne touche pas la BDD pour cette cellule.
          if (raw.trim() === "") continue;
          rows.push({
            user_id: user.id,
            period_year: year,
            period_month: p.month,
            activity_kind: c.id,
            amount_cents: parseToCents(raw),
            // Flag "déjà déclaré" propagé sur toutes les catégories de la
            // période. Si l'AE coche, ces lignes ne seront jamais soumises
            // à l'URSSAF par le cron (= sécurité anti-doublon).
            already_declared: declaredFlag,
          });
        }
      }

      if (rows.length > 0) {
        // Upsert sur la contrainte unique (user_id, period_year, period_month, activity_kind).
        const { error: upErr } = await supabase
          .from("prior_revenue")
          .upsert(rows, { onConflict: "user_id,period_year,period_month,activity_kind" });
        if (upErr) throw upErr;
      }

      // Flag prior_activity_resolved = true (au cas où l'user arrive ici
      // directement sans passer par le modal du dashboard).
      await supabase
        .from("profiles")
        .update({ prior_activity_resolved: true })
        .eq("id", user.id);

      // Flash "enregistré" + refresh pour reloader les valeurs depuis la DB.
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  // Cas particulier : aucune période passée à saisir (l'user a démarré
  // ce mois-ci). On affiche un message + un bouton qui marque juste le
  // flag resolved.
  if (periods.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <div className="mx-auto h-11 w-11 grid place-items-center rounded-2xl bg-success-500/10 text-success-600">
          <Check size={18} />
        </div>
        <div>
          <p className="text-body font-medium text-ink-900">Rien à importer pour l&apos;instant</p>
          <p className="mt-1 text-small text-ink-500">
            Tu démarres au début de la {frequency === "monthly" ? "période" : "trimestre"} en
            cours — aucune {frequency === "monthly" ? "mois" : "trimestre"} précédent{frequency === "monthly" ? "" : ""}{" "}
            n&apos;est encore clôturé pour {year}.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "…" : "Continuer"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sélecteur d'année — pills horizontales. Chaque pill est un Link
          (href=?year=YYYY) → la page recharge avec les bonnes périodes
          + entrées préchargées. Pas de state interne pour rester en
          synchro avec l'URL et permettre le bookmark / partage. */}
      {availableYears.length > 1 ? (
        <div className="inline-flex bg-surface-2 p-1 rounded-full overflow-x-auto max-w-full">
          {availableYears.map((y) => {
            const active = y === year;
            return (
              <a
                key={y}
                href={`/import?year=${y}`}
                className={
                  "px-4 py-1.5 rounded-full text-small font-medium whitespace-nowrap transition-all " +
                  (active
                    ? "bg-surface text-ink-900 shadow-hair"
                    : "text-ink-500 hover:text-ink-900")
                }
              >
                {y}
              </a>
            );
          })}
        </div>
      ) : null}

      {alreadyResolved ? (
        <div className="rounded-2xl bg-brand-500/5 border border-brand-500/15 p-3.5 flex items-start gap-2.5 text-xs text-ink-600">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            Tu as déjà validé cette étape. Tu peux quand même modifier ces valeurs ici —
            elles seront prises en compte dans tes prochaines déclarations.
          </span>
        </div>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead className="bg-surface-2 text-ink-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">
                  {frequency === "monthly" ? "Mois" : "Trimestre"}
                </th>
                {columns.map((c) => (
                  <th key={c.id} className="text-right font-medium px-4 py-3">
                    {c.label}
                  </th>
                ))}
                {/* Colonne flag "déjà déclaré à l'URSSAF" — par période.
                    L'AE coche pour les périodes qu'il a déjà déclarées
                    manuellement avant Asthia (sécurité anti-doublon). */}
                <th
                  className="text-center font-medium px-3 py-3 whitespace-nowrap"
                  title="Coche si tu as déjà déclaré cette période manuellement à l'URSSAF (Asthia ne re-soumettra pas)"
                >
                  Déjà
                  <br />
                  déclaré
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const declaredEntry = alreadyDeclared.get(p.month);
                const isLocked = Boolean(declaredEntry?.locked);
                const isChecked = Boolean(declaredEntry?.checked);
                return (
                  <tr key={p.month} className="border-t border-ink-100">
                    <td className="px-4 py-2.5 text-ink-900 capitalize">{p.label}</td>
                    {columns.map((c) => (
                      <td key={c.id} className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={values.get(`${p.month}-${c.id}`) ?? ""}
                            onChange={(e) => setCell(p.month, c.id, e.target.value)}
                            placeholder="0,00"
                            className="h-10 w-full rounded-lg bg-surface px-3 pr-7 text-right text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow tabular-nums"
                            aria-label={`${c.label} — ${p.label}`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400 pointer-events-none">
                            €
                          </span>
                        </div>
                      </td>
                    ))}
                    {/* Toggle "déjà déclaré". Si la période a déjà été
                        soumise par Asthia (submitted_at non null), on
                        verrouille — ne pas créer d'incohérence en BD. */}
                    <td className="px-3 py-2 text-center">
                      <label
                        className={`inline-flex items-center justify-center cursor-pointer ${
                          isLocked ? "cursor-not-allowed opacity-50" : ""
                        }`}
                        title={
                          isLocked
                            ? "Période déjà soumise via Asthia — verrouillée"
                            : "Coche si tu as déjà déclaré cette période à l'URSSAF avant Asthia"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={(e) => setPeriodDeclared(p.month, e.target.checked)}
                          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          aria-label={`Période ${p.label} — déjà déclarée à l'URSSAF`}
                        />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-2 text-ink-900 font-medium">
              <tr className="border-t border-ink-200">
                <td className="px-4 py-3 text-left">Total</td>
                {columns.map((c) => (
                  <td key={c.id} className="px-4 py-3 text-right tabular-nums">
                    {formatEUR(totals.byKind[c.id])}
                  </td>
                ))}
                {/* Cellule vide sous la colonne "Déjà déclaré" pour conserver
                    l'alignement du tableau. */}
                <td className="px-3 py-3" aria-hidden />
              </tr>
              {columns.length > 1 ? (
                <tr className="border-t border-ink-100">
                  <td colSpan={columns.length + 1} className="px-4 py-3 text-right text-ink-900 font-semibold tabular-nums">
                    Total général : {formatEUR(totals.grand)}
                  </td>
                </tr>
              ) : null}
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Légende du flag "déjà déclaré" */}
      <div className="rounded-2xl bg-brand-500/5 border border-brand-500/15 p-3.5 flex items-start gap-2.5 text-xs text-ink-600">
        <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
        <div>
          <p>
            <strong>Coche &laquo;&nbsp;Déjà déclaré&nbsp;&raquo;</strong> uniquement pour les périodes que tu as
            déjà déclarées toi-même à l&apos;URSSAF avant d&apos;utiliser Asthia.
            Asthia ne re-soumettra pas ces périodes (pas de double cotisation).
          </p>
          <p className="mt-1 text-ink-500">
            Pour les périodes non cochées, Asthia déclare automatiquement
            ces montants à l&apos;URSSAF lors du prochain passage du cron mensuel.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-small text-danger-600 bg-danger-500/10 rounded-2xl px-4 py-2.5">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {savedFlash ? (
          <span className="inline-flex items-center gap-1.5 text-small text-success-600">
            <Check size={14} /> Enregistré
          </span>
        ) : null}
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save size={14} />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Convertit une saisie utilisateur en centimes. Tolérant :
 *  - "1234"      → 123400
 *  - "1234.50"   → 123450
 *  - "1 234,50"  → 123450
 *  - " 12 € "    → 1200
 *  - ""          → 0
 * Retourne 0 sur entrée non parsable plutôt que NaN — la validation
 * "0 = pas de saisie" se fait au niveau du caller via raw.trim() === "".
 */
function parseToCents(raw: string): number {
  if (!raw) return 0;
  // Retire espaces, €, et normalise virgule → point
  const cleaned = raw.replace(/\s/g, "").replace(/€/g, "").replace(",", ".");
  const f = parseFloat(cleaned);
  if (!Number.isFinite(f) || f < 0) return 0;
  return Math.round(f * 100);
}

/**
 * Reconvertit centimes → string saisissable. Renvoie "1234,50" (format FR)
 * pour pré-remplir les inputs.
 */
function centsToInputStr(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
