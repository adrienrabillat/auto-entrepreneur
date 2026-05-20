import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";
import { EmailOtpForm } from "./email-otp-form";
import { HeroMockup } from "@/components/landing/hero-mockup";

/**
 * Landing publique — refonte "claude.ai-like" mai 2026.
 *
 * Structure :
 *  1. Header minimal (logo seul, pas de nav — minimalisme).
 *  2. Hero deux colonnes :
 *     - colonne gauche : H1 + sous-titre + bloc auth (Google + OTP).
 *     - colonne droite : mockup animé (cf. components/landing/hero-mockup.tsx).
 *  3. Section pricing : 2 cards (Free dispo aujourd'hui, Pro 2 €/mois
 *     "Bientôt — 1er janvier 2027"). CTA Pro désactivé.
 *  4. Footer légal (inchangé — conforme LCEN + partenariat URSSAF).
 *
 * Pas de FAQ ni de section feature détaillée : l'utilisateur a explicitement
 * demandé du minimalisme — chaque section doit servir à quelque chose.
 *
 * Le hero stacke en mobile (ordre : titre → auth → mockup en dessous,
 * pour ne pas pousser le formulaire sous la fold).
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Si l'onboarding n'est pas terminé, on ramène l'utilisateur sur le
    // wizard plutôt que sur le dashboard (sinon il atterrit sur une UI
    // qui suppose un profil complet et plante).
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
  }

  const err = searchParams.error;
  const isPkceError =
    err?.toLowerCase().includes("pkce") ||
    err?.toLowerCase().includes("code verifier");

  return (
    <main className="min-h-dvh flex flex-col bg-page-aurora">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="px-5 md:px-8 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image
            src="/logo.webp"
            alt="Asthia"
            width={28}
            height={28}
            priority
            className="h-7 w-7 rounded-md"
          />
          <span className="font-extrabold tracking-tight text-ink-900">
            Asthia
          </span>
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="px-5 md:px-8 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center py-10 md:py-16">
          {/* Colonne gauche — titre + auth */}
          <div className="w-full max-w-md mx-auto md:mx-0 md:max-w-none">
            <h1 className="text-[2.4rem] md:text-display leading-[1.05] font-extrabold tracking-tight text-ink-900">
              Facture, envoie,{" "}
              <span className="text-gradient-brand">déclare</span>.
            </h1>
            <p className="mt-3 text-body text-ink-500">
              Sans y penser. Asthia s&apos;occupe de tes factures et de
              ta déclaration URSSAF.
            </p>

            <div className="mt-8 space-y-4">
              <LoginButton next={searchParams.next} />

              {/* Séparateur "ou" entre Google et OTP email. Les deux
                  flows convergent sur le même compte si l'adresse email
                  est identique (Supabase déduplique par email). */}
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <span className="flex-1 h-px bg-divider" aria-hidden />
                <span className="uppercase tracking-wider">ou</span>
                <span className="flex-1 h-px bg-divider" aria-hidden />
              </div>

              <EmailOtpForm next={searchParams.next} />
            </div>

            {err ? (
              <div className="mt-5 rounded-2xl bg-danger-500/10 p-3.5 text-small text-danger-600">
                {isPkceError
                  ? "Connexion interrompue. Clique à nouveau sur « Se connecter » depuis le même appareil et le même navigateur."
                  : `Connexion interrompue : ${err}`}
              </div>
            ) : null}
          </div>

          {/* Colonne droite — mockup animé. Premier en DOM sur mobile
              serait un anti-pattern (le formulaire doit être au-dessus
              de la fold), donc on garde l'ordre logique et on s'appuie
              sur le grid pour le placement md+. */}
          <div className="order-last md:order-none">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section
        id="tarifs"
        className="px-5 md:px-8 max-w-6xl mx-auto w-full pb-16 md:pb-24 pt-4 md:pt-8"
      >
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-h1 md:text-display font-bold tracking-tight text-ink-900">
            Forfaits.
          </h2>
          <p className="mt-3 text-body text-ink-500">
            Gratuit aujourd&apos;hui. Le plan Pro arrive le 1<sup>er</sup>{" "}
            janvier 2027.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto">
          <PlanCard
            name="Free"
            tagline="Pour démarrer ton activité d'auto-entrepreneur."
            price="0 €"
            priceSuffix="pour toujours"
            cta={
              <Link
                href="#top"
                className="pill pill-primary w-full justify-center"
              >
                Commencer maintenant
              </Link>
            }
            features={[
              "Factures illimitées",
              "Envoi par email intégré",
              "Suivi des paiements en temps réel",
              "Déclaration URSSAF automatisée",
              "Export comptable (Excel / PDF)",
            ]}
          />

          <PlanCard
            name="Pro"
            tagline="Pour aller plus loin quand ton activité grandit."
            price="2 €"
            priceSuffix="par mois"
            badge="Disponible le 1ᵉʳ janvier 2027"
            cta={
              <button
                type="button"
                disabled
                className="pill pill-ghost w-full justify-center cursor-not-allowed opacity-70"
              >
                Bientôt disponible
              </button>
            }
            features={[
              "Tout ce qui est inclus dans Free",
              "Devis signés électroniquement",
              "Relances de paiement automatiques",
              "Multi-devises et TVA intracom",
              "Support prioritaire",
            ]}
            muted
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {/* Footer minimaliste — accès aux pages légales avant connexion.
          Sprint 5 #13 : obligatoire pour conformité LCEN.
          Le lien "L'essentiel du statut — Autoentrepreneur.urssaf.fr"
          est requis par l'URSSAF dans le cadre du partenariat API TDAE
          (Tierce Déclaration Auto-Entrepreneur) — il couvre les
          informations sur le statut, le caractère obligatoire des
          cotisations, leur rôle, et les éléments liés au droit du
          travail. */}
      <footer className="px-5 md:px-8 py-6 max-w-6xl mx-auto w-full mt-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
            <Link
              href="/legal/mentions-legales"
              className="hover:text-ink-700 transition-colors"
            >
              Mentions légales
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cgu" className="hover:text-ink-700 transition-colors">
              CGU
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cgv" className="hover:text-ink-700 transition-colors">
              CGV
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/legal/confidentialite"
              className="hover:text-ink-700 transition-colors"
            >
              Confidentialité
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/legal/statut-auto-entrepreneur"
              className="hover:text-ink-700 transition-colors"
            >
              Statut auto-entrepreneur
            </Link>
          </div>
          <a
            href="https://www.autoentrepreneur.urssaf.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors"
          >
            L&apos;essentiel du statut —{" "}
            <span className="underline underline-offset-2">
              Autoentrepreneur.urssaf.fr
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}

/**
 * Card de forfait — structure verticale unifiée (titre, prix, CTA,
 * features) pour que les deux cards aient exactement la même hauteur.
 *
 * `muted` rend la card un cran plus discrète (utilisé pour le Pro
 * "bientôt") : fond légèrement transparent, badge "Bientôt" visible.
 * Ça évite que le forfait indisponible soit aussi proéminent que celui
 * qui marche aujourd'hui.
 */
function PlanCard({
  name,
  tagline,
  price,
  priceSuffix,
  badge,
  cta,
  features,
  muted = false,
}: {
  name: string;
  tagline: string;
  price: string;
  priceSuffix: string;
  badge?: string;
  cta: React.ReactNode;
  features: string[];
  muted?: boolean;
}) {
  return (
    <div
      className={
        "relative surface p-6 md:p-7 flex flex-col " +
        (muted ? "ring-1 ring-divider/60" : "")
      }
    >
      {badge ? (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1.5 rounded-full bg-brand-500 text-white text-xs font-medium px-3 py-1.5 shadow-pop">
          {badge}
        </span>
      ) : null}

      <div>
        <h3 className="text-h2 font-bold text-ink-900">{name}</h3>
        <p className="mt-1 text-small text-ink-500">{tagline}</p>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-display font-bold tracking-tight text-ink-900 tabular-nums">
          {price}
        </span>
        <span className="text-small text-ink-500">{priceSuffix}</span>
      </div>

      <div className="mt-5">{cta}</div>

      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-full bg-brand-500/10 shrink-0">
              <Check className="h-3 w-3 text-brand-600" strokeWidth={3} />
            </span>
            <span className="text-small text-ink-700">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
