import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { NewQuoteForm } from "./form";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Page de création d'un devis. Calque /invoices/new mais en plus
 * léger : pas de wizard 3 étapes, juste un formulaire single-page.
 *
 * Charge la liste des clients existants pour pré-remplissage rapide,
 * et vérifie la complétude du profil (sans bloquer — un devis n'a pas
 * besoin d'IBAN par exemple).
 */
export default async function NewQuotePage() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [profileRes, clientsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, business_name, siren, siret, address_line1, postal_code, city, gmail_refresh_token")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id, name, email, siren, address_line1, postal_code, city")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name"),
  ]);
  const profile = profileRes.data;
  const clients = clientsRes.data ?? [];

  // Pour un devis on n'exige pas l'IBAN/BIC (paiement pas encore prévu),
  // mais le profil doit au moins avoir SIREN + adresse pour le PDF.
  const profileReady = Boolean(
    profile?.siren && profile?.siret && profile?.address_line1 && profile?.postal_code && profile?.city,
  );
  const gmailReady = Boolean(profile?.gmail_refresh_token);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 text-small text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Retour aux devis
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-h1">Nouveau devis</h1>
        <p className="mt-1 text-small text-ink-500">
          Crée un devis en moins d&apos;une minute. Tu pourras l&apos;envoyer par email
          juste après et le convertir en facture en un clic dès qu&apos;il est accepté.
        </p>
      </div>

      {!profileReady ? (
        <div className="rounded-2xl bg-warn-500/10 border border-warn-500/20 p-4 mb-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-warn-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-small font-medium text-ink-900">
              Ton profil est incomplet
            </p>
            <p className="text-xs text-ink-600">
              Pour générer un PDF de devis légal, tu dois renseigner ton SIRET et
              ton adresse pro. <Link href="/settings" className="underline">Aller aux paramètres</Link>.
            </p>
          </div>
        </div>
      ) : null}

      {!gmailReady ? (
        <div className="rounded-2xl bg-brand-500/5 border border-brand-500/15 p-4 mb-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-brand-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-small font-medium text-ink-900">
              Gmail pas encore connecté
            </p>
            <p className="text-xs text-ink-600">
              Tu peux quand même créer le devis (il sera enregistré en brouillon),
              mais pour l&apos;envoyer par email il faudra d&apos;abord{" "}
              <Link href="/settings" className="underline">connecter Gmail</Link>.
            </p>
          </div>
        </div>
      ) : null}

      <NewQuoteForm clients={clients} canSend={profileReady && gmailReady} />
    </div>
  );
}
