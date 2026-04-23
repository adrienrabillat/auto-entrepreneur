import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./form";
import { Badge } from "@/components/ui/card";
import { ReconnectGmailButton } from "./reconnect-gmail";
import { Mail, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const gmailActive = Boolean(profile.gmail_refresh_token);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-h1">
          Profil & <span className="text-gradient-brand">paramètres</span>
        </h1>
        <p className="mt-1 text-small text-ink-500">
          Ces infos apparaissent sur tes factures. Change-les à tout moment.
        </p>
      </div>

      <div className="surface p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-gradient-subtle text-brand-600">
            <Mail size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-900">Gmail</span>
              {gmailActive ? (
                <Badge tone="success">Actif</Badge>
              ) : (
                <Badge tone="warn">Non connecté</Badge>
              )}
            </div>
            <div className="text-small text-ink-500 truncate">
              {profile.gmail_connected_email ?? "Aucune adresse liée pour l'instant"}
            </div>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 pt-4 border-t border-ink-100 flex-wrap">
          <p className="text-small text-ink-500 flex-1 min-w-[220px]">
            Si l&apos;envoi d&apos;email échoue avec une erreur de permission,
            reconnecte Gmail en cochant bien &laquo;&nbsp;Envoyer des e-mails en
            votre nom&nbsp;&raquo; sur l&apos;écran Google.
          </p>
          <ReconnectGmailButton />
        </div>
      </div>

      <SettingsForm
        defaultValues={{
          display_name: profile.display_name ?? "",
          business_name: profile.business_name ?? "",
          legal_form: (profile.legal_form as "EI" | "EURL" | "SASU" | "Autre") ?? "EI",
          metier: profile.metier ?? "",
          siren: profile.siren ?? "",
          siret: profile.siret ?? "",
          ape_naf: profile.ape_naf ?? "",
          address_line1: profile.address_line1 ?? "",
          address_line2: profile.address_line2 ?? "",
          postal_code: profile.postal_code ?? "",
          city: profile.city ?? "",
          phone: profile.phone ?? "",
          website: profile.website ?? "",
          iban: profile.iban ?? "",
          bic: profile.bic ?? "",
          rcs_number: profile.rcs_number ?? "",
          rcs_city: profile.rcs_city ?? "",
          rm_number: profile.rm_number ?? "",
          rm_department: profile.rm_department ?? "",
          insurance_name: profile.insurance_name ?? "",
          insurance_coverage: profile.insurance_coverage ?? "",
          urssaf_declaration_day: profile.urssaf_declaration_day ?? 3,
        }}
      />

      <form action="/auth/signout" method="post" className="pt-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-small font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
