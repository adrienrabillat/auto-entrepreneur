import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { ArrowLeft } from "lucide-react";
import { NewMessageForm, type ClientOption, type DocOption } from "./form";

export const dynamic = "force-dynamic";

/**
 * Compose un nouveau message à un client (sans attendre qu'il réponde
 * à une facture). Création d'un thread "libre" (invoice_id / quote_id
 * nullable) ou rattaché à un document si l'AE le sélectionne.
 *
 * On charge en amont :
 *  - la liste des clients existants (pour le picker)
 *  - les factures/devis récents (pour permettre de rattacher le thread
 *    à un document si pertinent — utile pour les relances)
 *
 * Si l'AE n'a aucun client encore, on l'invite à en créer un avant.
 */
export default async function NewMessagePage({
  searchParams,
}: {
  searchParams?: { invoice?: string; quote?: string; client?: string };
}) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [{ data: clientsRaw }, { data: invoicesRaw }, { data: quotesRaw }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, is_pro, first_name, last_name, company_name, email")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("invoices")
        .select("id, number, client_email, client_name, amount_cents")
        .eq("user_id", user.id)
        .neq("invoice_type", "credit_note")
        .order("issued_on", { ascending: false })
        .limit(50),
      supabase
        .from("quotes")
        .select("id, number, client_email, client_name, amount_cents")
        .eq("user_id", user.id)
        .order("issued_on", { ascending: false })
        .limit(50),
    ]);

  const clients: ClientOption[] = (clientsRaw ?? []).map((c) => ({
    id: c.id,
    label: clientLabel(c),
    email: c.email,
  }));

  const invoices: DocOption[] = (invoicesRaw ?? []).map((i) => ({
    kind: "invoice",
    id: i.id,
    number: i.number,
    clientEmail: i.client_email,
    clientName: i.client_name,
  }));
  const quotes: DocOption[] = (quotesRaw ?? []).map((q) => ({
    kind: "quote",
    id: q.id,
    number: q.number,
    clientEmail: q.client_email,
    clientName: q.client_name,
  }));

  // Préselection via query params (utile pour ajouter un bouton "Écrire
  // à ce client" depuis la page facture/devis plus tard).
  const preset = {
    invoiceId: searchParams?.invoice ?? null,
    quoteId: searchParams?.quote ?? null,
    clientId: searchParams?.client ?? null,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <Link
          href="/messages"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={14} /> Messages
        </Link>
        <h1 className="text-h1 mt-3">Nouveau message</h1>
        <p className="mt-1 text-small text-ink-500">
          Écris à un client. Le message part depuis ton adresse Asthia, et
          ses réponses arriveront dans la même conversation.
        </p>
      </div>

      <NewMessageForm
        clients={clients}
        invoices={invoices}
        quotes={quotes}
        preset={preset}
      />
    </div>
  );
}

function clientLabel(c: {
  is_pro: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string;
}): string {
  if (c.is_pro && c.company_name) return c.company_name;
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}
