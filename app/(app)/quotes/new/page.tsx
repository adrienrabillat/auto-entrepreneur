import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { NewQuoteForm, type ClientOption } from "./form";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Page de création d'un devis. Calque /invoices/new — un wizard 3 étapes
 * (Client → Prestation → Aperçu) suivi du SuccessOverlay partagé.
 *
 * Pour un devis on n'exige PAS l'IBAN (pas de paiement attendu) mais on
 * a besoin du SIRET et de l'adresse pour le PDF légal.
 */
export default async function NewQuotePage() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("gmail_refresh_token, gmail_connected_email, siren, siret, address_line1, postal_code, city")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id, is_pro, first_name, last_name, company_name, siren, email, address_line1, address_line2, postal_code, city, country")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const gmailConnected = Boolean(profile?.gmail_refresh_token);
  const profileReady = Boolean(
    profile?.siren && profile?.siret && profile?.address_line1 && profile?.postal_code && profile?.city,
  );

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
        href="/quotes"
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Devis
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Nouveau devis</span>
      </h1>
      <p className="mt-1 text-small text-ink-500">
        Crée un devis en moins d&apos;une minute. Tu pourras le convertir en facture en
        un clic dès qu&apos;il est accepté.
      </p>

      {!profileReady ? (
        <div className="mt-5 rounded-2xl p-4 text-small bg-warn-500/10 flex items-start gap-3 text-warn-600">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            Profil incomplet (SIRET / adresse). Renseigne-les dans{" "}
            <Link href="/settings" className="underline font-semibold">Paramètres</Link>{" "}
            avant de générer un devis — ces infos sont obligatoires sur le PDF.
          </p>
        </div>
      ) : null}

      {!gmailConnected ? (
        <div className="mt-5 rounded-2xl p-4 text-small bg-warn-500/10 flex items-start gap-3 text-warn-600">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            Gmail n&apos;est pas encore connecté. Tu pourras créer le devis en brouillon ;
            pour l&apos;envoyer par email il faudra connecter Gmail depuis Paramètres.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <NewQuoteForm gmailConnected={gmailConnected} clients={clients} />
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
