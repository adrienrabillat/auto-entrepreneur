import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex items-start md:items-center justify-center bg-page py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-h1">Quelques infos pour tes factures</h1>
          <p className="mt-2 text-small text-ink-500">
            Ces informations apparaîtront sur toutes tes factures (mentions légales obligatoires — EI, SIREN, SIRET).
          </p>
        </div>
        <OnboardingForm
          defaultValues={{
            display_name: profile?.display_name ?? "",
            business_name: profile?.business_name ?? "",
            // legal_form n'est plus demandé : Asthia est verrouillé sur EI
            // au régime micro. La valeur est forcée à 'EI' au moment de
            // l'UPDATE dans form.tsx (et la contrainte CHECK Postgres
            // rejetterait toute autre valeur de toute façon).
            metier: profile?.metier ?? "",
            siren: profile?.siren ?? "",
            siret: profile?.siret ?? "",
            ape_naf: profile?.ape_naf ?? "",
            address_line1: profile?.address_line1 ?? "",
            address_line2: profile?.address_line2 ?? "",
            postal_code: profile?.postal_code ?? "",
            city: profile?.city ?? "",
            iban: profile?.iban ?? "",
            bic: profile?.bic ?? "",
            // Confirmation explicite du régime micro. Pré-cochée si l'user
            // revient sur l'onboarding après avoir déjà validé une fois,
            // sinon décochée par défaut pour forcer une action volontaire.
            is_micro: Boolean(profile?.onboarded),
          }}
        />
      </div>
    </main>
  );
}
