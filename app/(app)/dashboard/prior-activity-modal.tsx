"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { Loader2, FileText, FileSpreadsheet, Upload, Check } from "lucide-react";

/**
 * Modal bloquant affiché au premier dashboard quand l'user a coché
 * "j'ai déjà facturé cette année" à l'onboarding. Collecte les derniers
 * numéros (facture + devis) pour initialiser proprement les séquences,
 * et propose en option un import de compta passée.
 *
 * Pas de bouton "Plus tard" — la cohérence légale de la numérotation
 * exige que la séquence reprenne au bon endroit AVANT toute nouvelle
 * facture. Tant que l'user ne soumet pas, il revoit ce modal à chaque
 * arrivée sur /dashboard.
 *
 * Une fois soumis : UPDATE profiles avec
 *   - invoice_number_seed = lastInvoice
 *   - quote_number_seed   = lastQuote
 *   - prior_activity_resolved = true
 * puis router.refresh() pour faire disparaître le modal.
 */
export function PriorActivityModal({
  invoiceFormat,
  quoteFormat,
}: {
  invoiceFormat: string;
  quoteFormat: string;
}) {
  const router = useRouter();
  const [lastInvoice, setLastInvoice] = useState("");
  const [lastQuote, setLastQuote] = useState("");
  const [wantsImport, setWantsImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aperçu des prochains numéros : ce que sera la prochaine facture/devis
  // après initialisation. Utile pour rassurer l'user qu'il a bien tapé
  // le bon dernier numéro.
  const nextInvoicePreview = previewNext(invoiceFormat, lastInvoice);
  const nextQuotePreview = previewNext(quoteFormat, lastQuote);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation : on accepte 0 (pas de devis émis) mais pas de chaîne
    // vide. Number("") vaut 0, donc on regarde le string brut.
    if (lastInvoice.trim() === "" || lastQuote.trim() === "") {
      setError("Saisis les deux numéros (mets 0 si tu n'as encore rien émis dans la catégorie).");
      return;
    }
    const inv = Number(lastInvoice);
    const quo = Number(lastQuote);
    if (!Number.isFinite(inv) || inv < 0 || !Number.isInteger(inv)) {
      setError("Le dernier numéro de facture doit être un entier positif ou 0.");
      return;
    }
    if (!Number.isFinite(quo) || quo < 0 || !Number.isInteger(quo)) {
      setError("Le dernier numéro de devis doit être un entier positif ou 0.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée — reconnecte-toi.");
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          invoice_number_seed: inv,
          quote_number_seed: quo,
          prior_activity_resolved: true,
        })
        .eq("id", user.id);
      if (updateErr) throw updateErr;
      // router.refresh() refait tourner le Server Component dashboard avec
      // les valeurs à jour → showPriorActivity passe à false → le modal
      // disparaît proprement.
      router.refresh();
      // Si l'user a cliqué "Importer ma compta", on le redirige vers la
      // future page d'import. Pour l'instant ce parcours n'est pas codé,
      // on l'envoie sur une page placeholder en notant son intention.
      if (wantsImport) {
        router.push("/import");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  return (
    // Overlay plein écran. role="dialog" + aria-modal pour l'accessibilité.
    // Z-index élevé pour passer au-dessus de la nav. Pas de close-on-overlay-click
    // — le modal est volontairement bloquant.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prior-activity-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg surface p-6 md:p-7 space-y-5 animate-fade-in-up"
      >
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
            <FileText size={18} />
          </div>
          <div>
            <h2 id="prior-activity-title" className="text-h3 text-ink-900">
              Tu as déjà facturé cette année
            </h2>
            <p className="text-small text-ink-500 mt-0.5">
              On va initialiser tes compteurs avec tes derniers numéros, pour que la
              numérotation continue sans trou. La loi t&apos;oblige à garder une séquence
              continue — c&apos;est important.
            </p>
          </div>
        </div>

        {/* ─── Dernier numéro de facture ────────────────────────────── */}
        <div>
          <Label htmlFor="last_invoice">Dernier numéro de facture émis</Label>
          <Input
            id="last_invoice"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={lastInvoice}
            onChange={(e) => setLastInvoice(e.target.value)}
            placeholder="Ex: 46"
          />
          {nextInvoicePreview ? (
            <p className="mt-1.5 text-xs text-ink-500 flex items-center gap-1.5">
              <Check size={11} className="text-success-600" />
              Prochaine facture :{" "}
              <span className="font-mono text-ink-900">{nextInvoicePreview}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-500">
              Mets 0 si tu n&apos;as encore émis aucune facture cette année.
            </p>
          )}
        </div>

        {/* ─── Dernier numéro de devis ─────────────────────────────── */}
        <div>
          <Label htmlFor="last_quote">Dernier numéro de devis émis</Label>
          <Input
            id="last_quote"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={lastQuote}
            onChange={(e) => setLastQuote(e.target.value)}
            placeholder="Ex: 12"
          />
          {nextQuotePreview ? (
            <p className="mt-1.5 text-xs text-ink-500 flex items-center gap-1.5">
              <Check size={11} className="text-success-600" />
              Prochain devis :{" "}
              <span className="font-mono text-ink-900">{nextQuotePreview}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-500">
              Mets 0 si tu ne fais pas de devis ou si tu n&apos;en as encore émis aucun.
            </p>
          )}
        </div>

        {/* ─── Option : import compta passée ────────────────────────── */}
        <label
          htmlFor="wants_import"
          className="flex items-start gap-3 rounded-2xl bg-surface-2 border border-ink-100 p-3.5 cursor-pointer hover:bg-surface transition-colors"
        >
          <input
            id="wants_import"
            type="checkbox"
            checked={wantsImport}
            onChange={(e) => setWantsImport(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          <div className="space-y-0.5 flex-1">
            <p className="text-small font-medium text-ink-900 flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-brand-600" />
              Je veux aussi importer ma compta passée
            </p>
            <p className="text-xs text-ink-500">
              On t&apos;ouvrira un assistant pour saisir ton CA déjà encaissé cette
              année (par mois ou trimestre, par catégorie d&apos;activité). Optionnel —
              utile pour avoir des déclarations URSSAF justes dès le mois prochain.
            </p>
          </div>
        </label>

        {error ? (
          <p className="text-small text-danger-600 bg-danger-500/10 rounded-2xl px-4 py-2.5">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                {wantsImport ? <Upload size={14} /> : <Check size={14} />}
                {wantsImport ? "Continuer vers l'import" : "C'est parti"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Calcule le rendu du PROCHAIN numéro à partir d'une saisie utilisateur
 * (chaîne brute du dernier numéro). Renvoie une chaîne vide si la saisie
 * n'est pas un entier valide — l'aperçu disparaît, on n'affiche pas
 * "Prochain : NaN".
 */
function previewNext(format: string, lastInputRaw: string): string {
  const n = Number(lastInputRaw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || lastInputRaw.trim() === "") {
    return "";
  }
  // Logique identique à lib/invoice-number.ts → renderNumber(format, seq).
  // Dupliquée ici pour rester un composant client autonome (pas d'import
  // serveur).
  const year = String(new Date().getFullYear());
  const next = n + 1;
  return format
    .replace(/\{year\}/g, year)
    .replace(/\{seq:(\d+)\}/g, (_, p) => String(next).padStart(parseInt(p, 10), "0"))
    .replace(/\{seq\}/g, String(next));
}
