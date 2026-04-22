import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewInvoiceForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("gmail_refresh_token, gmail_connected_email, display_name")
    .eq("id", user!.id)
    .maybeSingle();

  const gmailConnected = Boolean(profile?.gmail_refresh_token);

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/invoices" className="text-small text-ink-500 hover:text-ink-800">
        ← Factures
      </Link>
      <h1 className="text-h1 mt-3">Nouvelle facture</h1>
      <p className="mt-1 text-small text-ink-500">
        Décris ta prestation, indique le montant et l&apos;email du client. La facture part
        {gmailConnected ? ` depuis ${profile?.gmail_connected_email}` : " depuis ta boîte Gmail"}, avec
        une copie pour toi.
      </p>

      {!gmailConnected ? (
        <div className="mt-5 surface p-4 text-small text-warn-600 bg-warn-50">
          Gmail n&apos;est pas encore connecté. Tu pourras quand même créer la facture en brouillon ; pour
          l&apos;envoyer, reconnecte-toi avec Google depuis la page d&apos;accueil (la 1ʳᵉ connexion
          autorise l&apos;envoi).
        </div>
      ) : null}

      <div className="mt-6">
        <NewInvoiceForm gmailConnected={gmailConnected} />
      </div>
    </div>
  );
}
