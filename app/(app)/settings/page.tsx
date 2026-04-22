import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./form";
import { Badge } from "@/components/ui/card";

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

      <div className="surface p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-small text-ink-500">Gmail connecté</div>
          <div className="text-body text-ink-800">{profile.gmail_connected_email ?? "Non connecté"}</div>
        </div>
        {profile.gmail_refresh_token ? (
          <Badge tone="success">Actif</Badge>
        ) : (
          <Badge tone="warn">Non connecté</Badge>
        )}
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
