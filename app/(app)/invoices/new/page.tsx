import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewInvoiceForm, type ClientOption } from "./form";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("gmail_refresh_token, gmail_connected_email, display_name, iban, bic")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id, is_pro, first_name, last_name, company_name, siren, email, address_line1, address_line2, postal_code, city, country")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const gmailConnected = Boolean(profile?.gmail_refresh_token);
  const bankingReady = Boolean(profile?.iban && profile?.bic);

  const clients: ClientOption[] = (clientsRaw ?? []).map((c) => ({
    id: c.id,
    label: renderLabel(c),
    is_pro: c.is_pro,
    name: buildName(c),
    email: c.email,
    siren: c.siren,
    address: buildAddress(c),
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Factures
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Nouvelle facture</span>
      </h1>
      <p className="mt-1 text-small text-ink-500">
        Décris ta prestation, indique le montant et l&apos;email du client. La facture part
        {gmailConnected ? ` depuis ${profile?.gmail_connected_email}` : " depuis ta boîte Gmail"}, avec
        une copie pour toi.
      </p>

      {!bankingReady ? (
        <div className="mt-5 rounded-2xl p-4 text-small bg-warn-50 ring-1 ring-inset ring-warn-200 flex items-start gap-3 text-warn-700">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            IBAN / BIC manquants. Renseigne-les dans{" "}
            <Link href="/settings" className="underline font-semibold">Profil → Coordonnées bancaires</Link>{" "}
            avant de générer la facture — ce bloc est obligatoire sur le PDF.
          </p>
        </div>
      ) : null}

      {!gmailConnected ? (
        <div className="mt-5 rounded-2xl p-4 text-small bg-warn-50 ring-1 ring-inset ring-warn-200 flex items-start gap-3 text-warn-700">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            Gmail n&apos;est pas encore connecté. Tu pourras quand même créer la facture en brouillon ; pour
            l&apos;envoyer, reconnecte-toi avec Google depuis la page d&apos;accueil (la 1ʳᵉ connexion
            autorise l&apos;envoi).
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <NewInvoiceForm gmailConnected={gmailConnected} clients={clients} />
      </div>
    </div>
  );
}

type RawClient = {
  id: string;
  is_pro: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  siren: string | null;
  email: string;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
};

function renderLabel(c: RawClient): string {
  if (c.is_pro && c.company_name) {
    const who = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return who ? `${c.company_name} — ${who}` : c.company_name;
  }
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}

function buildName(c: RawClient): string {
  if (c.is_pro && c.company_name) return c.company_name;
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}

function buildAddress(c: RawClient): string | null {
  const lines = [
    c.address_line1,
    c.address_line2,
    [c.postal_code, c.city].filter(Boolean).join(" ") || null,
    c.country && c.country !== "France" ? c.country : null,
  ].filter(Boolean) as string[];
  return lines.length ? lines.join("\n") : null;
}
