import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SettingsForm } from "./form";
import { Badge } from "@/components/ui/card";
import { ReconnectGmailButton } from "./reconnect-gmail";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Mail, LogOut, Palette } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Les deux requêtes étaient séquentielles → 2× round-trip DB sur chaque
  // navigation vers /settings. Elles sont indépendantes l'une de l'autre,
  // donc Promise.all économise un aller-retour réseau (~50-150ms typique
  // sur Supabase EU). Le profile est requis pour le formulaire ; firstInvoice
  // sert juste à savoir si on peut encore changer le format de numérotation.
  const [{ data: profile }, { data: firstInvoice }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("invoices")
      .select("id")
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle(),
  ]);
  const invoicesAlreadyEmitted = Boolean(firstInvoice);

  const gmailActive = Boolean(profile.gmail_refresh_token);

  // Détection du mode d'authentification : un utilisateur qui s'est inscrit
  // par email/mot de passe (instructeur URSSAF, AE sans compte Google…) n'a
  // pas d'identité Google liée. Dans ce cas, l'envoi de factures passe par
  // Resend (identité unifiée Asthia) et le bloc "Reconnecter Gmail" n'a
  // aucun sens — il enverrait l'utilisateur sur un OAuth Google qu'il n'a
  // jamais initié. On masque donc le bloc.
  //
  // Garde-fou : si `gmailActive` est vrai (refresh token déjà stocké),
  // on garde la carte affichée — l'utilisateur a déjà connecté Gmail à un
  // moment, on lui laisse la possibilité de reconnecter.
  const linkedProviders =
    (user as { app_metadata?: { providers?: string[]; provider?: string } } | null)
      ?.app_metadata?.providers ??
    (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const hasGoogleIdentity = linkedProviders.includes("google");
  const showGmailCard = hasGoogleIdentity || gmailActive;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1">Profil & paramètres</h1>
        <p className="mt-1 text-small text-ink-500">
          Ces infos apparaissent sur tes factures. Change-les à tout moment.
        </p>
      </div>

      {showGmailCard && (
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
      )}

      <div className="surface p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
            <Palette size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-ink-900">Thèmes</div>
            <div className="text-small text-ink-500">Couleur d&apos;accent et mode clair / sombre — appliqués instantanément.</div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <SettingsForm
        invoicesAlreadyEmitted={invoicesAlreadyEmitted}
        defaultValues={{
          display_name: profile.display_name ?? "",
          business_name: profile.business_name ?? "",
          // legal_form n'est plus exposé en UI : c'est verrouillé à 'EI'
          // côté DB (CHECK) et l'onboarding force la valeur. Voir
          // app/onboarding/form.tsx + migration 2026-04-26b.
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
          mediator_name: profile.mediator_name ?? "",
          mediator_website: profile.mediator_website ?? "",
          // Activité & URSSAF (colonnes ajoutées dans 2026-04-26c).
          activity_kind: (profile.activity_kind as "vente" | "service_bic" | "liberal_bnc" | "mixte" | undefined) ?? "",
          urssaf_frequency: (profile.urssaf_frequency as "monthly" | "quarterly" | undefined) ?? "monthly",
          urssaf_declaration_day: profile.urssaf_declaration_day ?? 3,
          invoice_number_format: profile.invoice_number_format ?? "F-{year}-{seq:4}",
          quote_number_format: profile.quote_number_format ?? "D-{year}-{seq:4}",
        }}
      />

      <form action="/auth/signout" method="post" className="pt-2 flex justify-center">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-small font-medium text-danger-600 bg-danger-500/10 hover:bg-danger-500/20 transition-colors"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
