import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./form";
import { Badge } from "@/components/ui/card";
import { ReconnectGmailButton } from "./reconnect-gmail";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-h1">Profil & paramètres</h1>
        <p className="mt-1 text-small text-ink-500">
          Ces infos apparaissent sur tes factures. Change-les à tout moment.
        </p>
      </div>

      <div className="surface p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-small text-ink-500">Gmail connecté</div>
            <div className="text-body text-ink-800">
              {profile.gmail_connected_email ?? "Non connecté"}
            </div>
          </div>
          {profile.gmail_refresh_token ? (
            <Badge tone="success">Actif</Badge>
          ) : (
            <Badge tone="warn">Non connecté</Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-ink-200">
          <p className="text-small text-ink-500">
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
          iban: profile.iban ?? "",
          bic: profile.bic ?? "",
          urssaf_declaration_day: profile.urssaf_declaration_day ?? 3,
        }}
      />
    </div>
  );
}
