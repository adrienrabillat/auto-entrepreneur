import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";

/**
 * Extrait un nom d'affichage depuis les metadata Google OAuth, avec une
 * cascade de fallbacks. Google envoie systématiquement `full_name` et `name`
 * sur le scope userinfo.profile ; en dernier recours on prend la partie
 * locale de l'email pour ne JAMAIS rendre un input vraiment vide.
 *
 * Cette logique double celle du trigger SQL handle_new_user — c'est
 * volontaire : si le trigger n'a pas tourné (compte créé avant son ajout,
 * ou trigger pas encore appliqué en prod), le formulaire reste utilisable.
 */
function pickDisplayName(
  meta: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const m = meta ?? {};
  const candidates = [
    m.full_name,
    m.name,
    [m.given_name, m.family_name].filter(Boolean).join(" ").trim(),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  if (email && email.includes("@")) return email.split("@")[0];
  return "";
}

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

  // Pré-remplissage Google : si le profil n'a rien (ou que le trigger SQL
  // n'a jamais tourné pour ce compte), on retombe sur user_metadata, qui
  // contient le payload OAuth Google. Backfill silencieux en BDD pour que
  // toutes les pages avales (settings, factures…) voient la bonne valeur.
  const googleName = pickDisplayName(user.user_metadata, user.email);
  const resolvedDisplayName = profile?.display_name?.trim() || googleName;
  if (!profile?.display_name && googleName) {
    await supabase
      .from("profiles")
      .update({ display_name: googleName })
      .eq("id", user.id);
  }

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
            display_name: resolvedDisplayName,
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
            // Étape 4 — Activité & URSSAF (defaults safe pour démarrer)
            activity_kind: (profile?.activity_kind as "vente" | "service_bic" | "liberal_bnc" | "mixte" | undefined) ?? "",
            urssaf_frequency: (profile?.urssaf_frequency as "monthly" | "quarterly" | undefined) ?? "monthly",
            urssaf_declaration_day: profile?.urssaf_declaration_day ?? 3,
            invoice_number_format: profile?.invoice_number_format ?? "F-{year}-{seq:4}",
            had_prior_activity: Boolean(profile?.had_prior_activity),
            // Étape 5 — Bancaire
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
