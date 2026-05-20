import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";
import { EmailOtpForm } from "./email-otp-form";
import { HeroMockup } from "@/components/landing/hero-mockup";

/**
 * Landing publique — refonte mai 2026 (v2).
 *
 * Mobile : tout centré, pas de mockup (la création de facture animée
 * encombrerait trop l'écran et pousserait le formulaire d'auth sous la
 * fold). Desktop : hero deux colonnes (auth à gauche, mockup animé à
 * droite) façon claude.ai.
 *
 * Pricing : Asthia est en phase de lancement → gratuit jusqu'à fin 2026.
 * À partir du 1ᵉʳ janvier 2027 : 2 € / mois (1ᵉʳ mois offert). Les deux
 * forfaits sont fonctionnellement identiques — la liste de features est
 * affichée une seule fois, sous les deux cards, pour ne pas dupliquer.
 *
 * Footer : ultra-minimaliste (liens légaux uniquement). Le lien URSSAF
 * "L'essentiel du statut — autoentrepreneur.urssaf.fr" exigé par le
 * partenariat TDAE a été déplacé dans la page /more de l'espace
 * authentifié — c'est plus pertinent UX-wise (visible au moment de la
 * déclaration) et plus propre côté landing.
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
      {/* Logo + wordmark légèrement plus gros qu'avant (28→36 px sur le
          logo, taille de corps→16 px sur le mot) pour donner plus de
          présence au brand sans tomber dans le lourd. */}
      <header className="px-5 md:px-8 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/logo.webp"
            alt="Asthia"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-h3 font-extrabold tracking-tight text-ink-900">
            Asthia
          </span>
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      {/* min-h-[calc(100dvh-72px)] sur mobile (72px = hauteur header) pour
          que TOUT le hero (titre + sous-titre + card auth) tienne dans le
          viewport sans scroll, façon claude.ai. Sur desktop on revient à
          un padding vertical classique car la grid 2 colonnes a besoin
          d'un peu d'espace haut/bas pour respirer, et le mockup à droite
          se cale verticalement.

          dvh (dynamic viewport) plutôt que vh : sur iOS Safari, vh inclut
          la barre d'adresse à 100 % même quand elle se rétracte, ce qui
          fait scroller pour rien. dvh suit la taille réelle visible. */}
      <section className="px-5 md:px-8 max-w-6xl mx-auto w-full min-h-[calc(100dvh-72px)] md:min-h-0 flex flex-col justify-center md:block">
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center md:py-16">
          {/* Colonne gauche — titre + sous-titre + card auth.
              Mobile : tout centré (text-center, mx-auto).
              Desktop : la card auth reste centrée dans sa colonne mais le
              titre s'aligne à gauche pour suivre l'axe du mockup à
              droite (lecture occidentale gauche → droite). */}
          <div className="w-full max-w-md mx-auto text-center md:text-left md:mx-0 md:max-w-none">
            <h1 className="text-[2.75rem] md:text-display leading-[1.05] font-extrabold tracking-tight text-ink-900">
              Facture, envoie,{" "}
              <span className="text-gradient-brand">déclare</span>.
            </h1>
            <p className="mt-3 text-body text-ink-500">
              Sans y penser. Asthia s&apos;occupe de tes factures et de
              ta déclaration URSSAF.
            </p>

            {/* Card "auth" — envelope Google + séparateur + email dans
                une seule bulle blanche (surface). Pattern Claude :
                regrouper visuellement tous les modes de connexion pour
                ne pas donner l'impression de deux CTA distincts.
                Centrée horizontalement sur les deux breakpoints (mx-auto)
                avec max-w-md pour qu'elle garde une taille raisonnable
                même quand la colonne est large. */}
            <div className="mt-7 surface p-5 md:p-6 w-full max-w-md mx-auto space-y-4 text-left">
              <LoginButton next={searchParams.next} />

              {/* Séparateur "ou" entre Google et OTP email. Les deux flows
                  convergent sur le même compte si l'email est identique
                  (Supabase déduplique par email). */}
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <span className="flex-1 h-px bg-divider" aria-hidden />
                <span className="uppercase tracking-wider">ou</span>
                <span className="flex-1 h-px bg-divider" aria-hidden />
              </div>

              <EmailOtpForm next={searchParams.next} />

              {err ? (
                <div className="rounded-2xl bg-danger-500/10 p-3.5 text-small text-danger-600">
                  {isPkceError
                    ? "Connexion interrompue. Clique à nouveau sur « Se connecter » depuis le même appareil et le même navigateur."
                    : `Connexion interrompue : ${err}`}
                </div>
              ) : null}
            </div>
          </div>

          {/* Colonne droite — mockup animé.
              Caché en mobile (cf. demande user 20/05/2026 : "on la retire
              sur mobile et il faut centrer le tout"). L'animation est
              décorative ; pas d'impact accessibilité, le hero reste
              compréhensible sans. */}
          <div className="hidden md:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section
        id="tarifs"
        className="px-5 md:px-8 max-w-6xl mx-auto w-full pb-16 md:pb-24 pt-4 md:pt-8"
      >
        <div className="text-center mb-10 md:mb-12 max-w-xl mx-auto">
          <h2 className="text-h1 md:text-display font-bold tracking-tight text-ink-900">
            Une offre, simple.
          </h2>
          <p className="mt-3 text-body text-ink-500">
            Asthia est gratuit pendant la phase de lancement. À partir du
            1<sup>er</sup> janvier 2027, le service passera à 2 € par
            mois, avec le premier mois offert.
          </p>
        </div>

        {/* Deux cards côte à côte qui matérialisent la transition
            "maintenant gratuit → bientôt payant". Le contenu fonctionnel
            est identique (cf. la liste de features unique en dessous),
            donc les cards restent volontairement compactes : juste le
            prix, la période, le CTA. */}
        <div className="grid md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto">
          <PlanCard
            badge="Maintenant"
            period="Pendant le lancement"
            price="0 €"
            priceSuffix="jusqu'au 31 décembre 2026"
            cta={
              <Link
                href="#top"
                className="pill pill-primary w-full justify-center"
              >
                Commencer maintenant
              </Link>
            }
            highlight
          />

          <PlanCard
            badge="À partir du 1ᵉʳ janvier 2027"
            period="Premier mois offert"
            price="2 €"
            priceSuffix="par mois"
            cta={
              // Bouton désactivé mais lisible : on conserve le contraste
              // texte/bouton normal du pill-ghost, on signale juste la
              // non-cliquabilité via cursor-not-allowed. Le label explicite
              // (date précise) remplace "Bientôt disponible" qui dévalorisait
              // sans informer — cf. audit du 20/05/2026.
              <button
                type="button"
                disabled
                className="pill pill-ghost w-full justify-center cursor-not-allowed"
              >
                Disponible le 1ᵉʳ janvier 2027
              </button>
            }
          />
        </div>

        {/* Une seule liste de features puisque les deux forfaits sont
            fonctionnellement identiques — pas la peine de la dupliquer
            dans les deux cards. */}
        <div className="mt-10 md:mt-12 max-w-3xl mx-auto">
          <p className="text-center text-small text-ink-500 mb-5">
            Dans les deux cas, tu as :
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 max-w-xl mx-auto">
            {[
              "Factures illimitées",
              "Envoi par email intégré",
              "Suivi des paiements en temps réel",
              "Déclaration URSSAF automatisée",
              "Devis transformables en facture",
              "Export comptable (Excel / PDF)",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-full bg-brand-500/10 shrink-0">
                  <Check className="h-3 w-3 text-brand-600" strokeWidth={3} />
                </span>
                <span className="text-small text-ink-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {/* Footer minimaliste — uniquement les liens légaux requis avant
          connexion (LCEN). Le lien URSSAF "L'essentiel du statut" a été
          déplacé dans l'espace authentifié (page /more) pour rester
          conforme au partenariat TDAE sans alourdir la landing.

          © + année dynamique : on prend new Date() côté server à chaque
          render, simple et suffisamment précis pour un footer. */}
      <footer className="px-5 md:px-8 py-6 max-w-6xl mx-auto w-full mt-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
            <Link
              href="/legal/mentions-legales"
              className="hover:text-ink-700 transition-colors"
            >
              Mentions légales
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/legal/cgu"
              className="hover:text-ink-700 transition-colors"
            >
              CGU
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/legal/cgv"
              className="hover:text-ink-700 transition-colors"
            >
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
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} Asthia
          </p>
        </div>
      </footer>
    </main>
  );
}

/**
 * Card de forfait — version compacte (badge / période / prix / CTA),
 * sans liste de features (mutualisée en dessous des deux cards).
 *
 * `highlight` rend la card courante (offre dispo aujourd'hui) plus
 * proéminente : ring brand et ombre prononcée. L'autre card reste
 * neutre pour bien montrer qu'elle est "future".
 */
function PlanCard({
  badge,
  period,
  price,
  priceSuffix,
  cta,
  highlight = false,
}: {
  badge: string;
  period: string;
  price: string;
  priceSuffix: string;
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "relative surface p-6 md:p-7 flex flex-col " +
        // On garde la card "future" pleinement contrastée (audit critique :
        // un opacity-95 donnait une impression de "fonctionnalité bloquée").
        // La distinction visuelle entre les deux offres passe uniquement
        // par le ring (brand vibrant vs divider neutre) et le badge.
        (highlight
          ? "ring-2 ring-brand-500/40"
          : "ring-1 ring-divider/60")
      }
    >
      <span
        className={
          "inline-flex self-start items-center rounded-full text-xs font-medium px-3 py-1.5 " +
          (highlight
            ? "bg-brand-500 text-white shadow-pop"
            : "bg-surface-2 text-ink-700")
        }
      >
        {badge}
      </span>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-display font-bold tracking-tight text-ink-900 tabular-nums">
          {price}
        </span>
        <span className="text-small text-ink-500">{priceSuffix}</span>
      </div>
      <p className="mt-1 text-xs text-ink-400">{period}</p>

      <div className="mt-6">{cta}</div>
    </div>
  );
}
