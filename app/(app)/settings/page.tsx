import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SettingsForm } from "./form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOut, Palette, Send } from "lucide-react";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1">Profil & paramètres</h1>
        <p className="mt-1 text-small text-ink-500">
          Ces infos apparaissent sur tes factures. Change-les à tout moment.
        </p>
      </div>

      {/* Bloc info "Envoi via Asthia" — purement informatif. Tout l'envoi
          de factures et de devis passe par l'identité unifiée
          factures@asthia.fr (Resend), avec ton email perso en Reply-To. */}
      <div className="surface p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-gradient-subtle text-brand-600">
            <Send size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink-900">Envoi de factures</div>
            <div className="text-small text-ink-500">
              Tes factures et devis partent depuis{" "}
              <strong className="font-medium">factures@asthia.fr</strong>. Quand
              ton client clique &laquo;&nbsp;Répondre&nbsp;&raquo;, sa réponse
              arrive directement sur{" "}
              <strong className="font-medium">{profile.email}</strong>.
            </div>
          </div>
        </div>
      </div>

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
