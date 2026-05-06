import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { ImportRevenueForm } from "./form";
import { ArrowLeft, ArrowRight, FileSpreadsheet, FileUp } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Assistant d'import du CA déjà encaissé cette année.
 *
 * Server Component — charge les paramètres du profil (catégorie d'activité
 * et fréquence URSSAF), construit la liste des PÉRIODES PASSÉES depuis le
 * 1er janvier jusqu'à aujourd'hui exclus (on n'importe pas la période en
 * cours, elle est déjà alimentée par les vraies factures), et précharge
 * les saisies déjà effectuées (pour permettre de revenir éditer).
 *
 * Le form client en aval (ImportRevenueForm) gère la grille de saisie et
 * l'upsert vers la table prior_revenue.
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("activity_kind, urssaf_frequency, prior_activity_resolved")
    .eq("id", user.id)
    .maybeSingle();

  // Si l'user n'a pas encore choisi sa catégorie d'activité (cas où il
  // arrive ici sans passer par l'onboarding), on le renvoie au paramétrage.
  if (!profile?.activity_kind) {
    return (
      <div className="max-w-xl mx-auto">
        <BackLink />
        <div className="surface p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 grid place-items-center rounded-full bg-warn-500/10 text-warn-700">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h1 className="text-h2 text-ink-900">Renseigne d&apos;abord ton activité</h1>
            <p className="mt-2 text-small text-ink-500">
              Pour pré-remplir la grille avec les bonnes catégories, on a besoin
              que tu choisisses d&apos;abord ta catégorie d&apos;activité dans tes paramètres.
            </p>
          </div>
          <Link href="/settings" className="pill pill-primary">
            Aller aux paramètres
          </Link>
        </div>
      </div>
    );
  }

  // Année cible : on accepte ?year=YYYY pour permettre à l'AE d'éditer
  // une année passée (ex: importer son CA 2024 a posteriori). Garde-fou :
  // limité aux 5 dernières années (current → current-4) pour éviter qu'on
  // se retrouve à saisir des données de 2010.
  const now = new Date();
  const currentYear = now.getFullYear();
  const requestedYear = parseInt(searchParams?.year ?? "", 10);
  const year =
    Number.isFinite(requestedYear) &&
    requestedYear >= currentYear - 4 &&
    requestedYear <= currentYear
      ? requestedYear
      : currentYear;

  // Liste des années sélectionnables : current et 4 années précédentes.
  // On les passe au form pour qu'il rende un sélecteur (pills).
  const availableYears: number[] = [];
  for (let y = currentYear; y >= currentYear - 4; y--) availableYears.push(y);

  // Construction des périodes à saisir.
  // - Année passée : toutes les périodes (12 mois ou 4 trimestres).
  // - Année courante : périodes entièrement écoulées uniquement.
  const periods = buildAvailablePeriods(now, year, profile.urssaf_frequency as "monthly" | "quarterly");

  // Précharge des entrées déjà saisies POUR L'ANNÉE CIBLE.
  const { data: existing } = await supabase
    .from("prior_revenue")
    .select("period_year, period_month, activity_kind, amount_cents, already_declared, submitted_at")
    .eq("user_id", user.id)
    .eq("period_year", year);

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink />
      <div className="space-y-6">
        <div>
          <h1 className="text-h1">Importe ton CA encaissé cette année</h1>
          <p className="mt-2 text-small text-ink-500">
            Saisis ce que tu as déjà encaissé depuis le 1<sup>er</sup> janvier {year}.
            Cela sert à calculer correctement tes seuils annuels et à éviter de te
            retrouver à devoir tout ressaisir manuellement. Tu peux revenir
            modifier ces chiffres plus tard.
          </p>
        </div>
        <ImportRevenueForm
          year={year}
          availableYears={availableYears}
          activityKind={profile.activity_kind as "vente" | "service_bic" | "liberal_bnc" | "mixte"}
          frequency={profile.urssaf_frequency as "monthly" | "quarterly"}
          periods={periods}
          existing={existing ?? []}
          alreadyResolved={Boolean(profile.prior_activity_resolved)}
        />

        {/* Lien secondaire vers l'import de factures historiques.
            Sépare bien les 2 use-cases : ici on saisit du CA agrégé,
            là-bas on importe des factures détaillées d'un autre logiciel. */}
        <Link
          href="/import/factures"
          className="surface p-4 flex items-center gap-3 hover:shadow-pop transition-shadow group"
        >
          <div className="h-10 w-10 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0">
            <FileUp size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-small font-medium text-ink-900">
              Tu changes de logiciel ? Importe tes factures historiques
            </p>
            <p className="text-xs text-ink-500">
              Téléverse un CSV ou XLSX pour rapatrier ton historique en lecture
              seule (pas de re-déclaration URSSAF, pas d&apos;envoi email).
            </p>
          </div>
          <ArrowRight size={16} className="text-ink-400 group-hover:text-brand-600 transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-small text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Retour au dashboard
      </Link>
    </div>
  );
}

/**
 * Construit la liste des périodes saisissables pour `targetYear`.
 *
 * - Si `targetYear` est strictement avant l'année en cours : toutes les
 *   périodes sont disponibles (12 mois ou 4 trimestres).
 * - Si `targetYear` est l'année en cours : seules les périodes entièrement
 *   écoulées (depuis janvier jusqu'au mois/trimestre précédent inclus).
 * - Si `targetYear` est une année future : aucune période (l'UI gère
 *   l'affichage du cas vide).
 *
 * Trié du plus ancien au plus récent.
 */
function buildAvailablePeriods(
  now: Date,
  targetYear: number,
  frequency: "monthly" | "quarterly",
): { month: number; label: string }[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Limite supérieure : pour l'année courante = mois en cours, sinon = 13
  // (= toute l'année saisissable).
  const monthCap = targetYear < currentYear ? 13 : currentYear === targetYear ? currentMonth : 1;

  if (frequency === "monthly") {
    const out: { month: number; label: string }[] = [];
    for (let m = 1; m < monthCap; m++) {
      out.push({ month: m, label: monthLabel(m, targetYear) });
    }
    return out;
  }

  // Trimestriel : T1 = mois 1-3, T2 = 4-6, T3 = 7-9, T4 = 10-12.
  // Un trimestre est "entièrement écoulé" si son dernier mois est < monthCap.
  const out: { month: number; label: string }[] = [];
  const trimesters = [
    { start: 1, end: 3, label: `T1 ${targetYear} (jan–mars)` },
    { start: 4, end: 6, label: `T2 ${targetYear} (avr–juin)` },
    { start: 7, end: 9, label: `T3 ${targetYear} (juil–sept)` },
    { start: 10, end: 12, label: `T4 ${targetYear} (oct–déc)` },
  ];
  for (const t of trimesters) {
    if (t.end < monthCap) {
      out.push({ month: t.start, label: t.label });
    }
  }
  return out;
}

function monthLabel(month: number, year: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
