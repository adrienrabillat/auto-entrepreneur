import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";
import { EmailOtpForm } from "./email-otp-form";

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
      {/* Brand bien présent : logo 44 px + wordmark text-h2 (20 px) en
          extrabold. Calé sur max-w-7xl pour s'aligner avec le hero. */}
      <header className="px-5 md:px-8 py-5 max-w-7xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/logo.webp"
            alt="Asthia"
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-xl"
          />
          <span className="text-h2 font-extrabold tracking-tight text-ink-900">
            Asthia
          </span>
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      {/* min-h-[calc(100dvh-72px)] sur TOUS les breakpoints (72 px = hauteur
          du header) : le hero — titre + sous-titre + card auth (et mockup
          à droite en desktop) — tient pile dans le premier viewport sans
          scroll, façon claude.ai. La section de pricing apparaît au
          scroll juste après.

          dvh (dynamic viewport) plutôt que vh : sur iOS Safari, vh inclut
          la barre d'adresse à 100 % même quand elle se rétracte, ce qui
          fait scroller pour rien. dvh suit la taille réelle visible.

          On utilise flex+justify-center plutôt qu'un padding vertical :
          comme ça le contenu reste centré quelle que soit la hauteur de
          l'écran (gros 27" vs MacBook 13"). */}
      <section className="px-5 md:px-8 max-w-7xl mx-auto w-full min-h-[calc(100dvh-88px)] flex flex-col justify-center">
        {/* Grille asymétrique mais rééquilibrée par rapport à l'itération
            précédente (1fr_1.5fr en lg) : la col gauche est maintenant
            assez large pour que "Facture, envoie," tienne sur une ligne
            au plus gros breakpoint. Gap moderate (16/20/24) — assez
            d'espace pour séparer zone login et zone démo, sans être
            énorme comme avant. */}
        <div className="grid md:grid-cols-[1fr_1.2fr] lg:grid-cols-[1fr_1.3fr] xl:grid-cols-[1fr_1.5fr] gap-12 md:gap-16 lg:gap-20 items-center">
          {/* Colonne gauche — titre + sous-titre + card auth.
              Mobile : tout centré (text-center, mx-auto).
              Desktop : la card auth reste centrée dans sa colonne mais le
              titre s'aligne à gauche pour suivre l'axe du mockup à
              droite (lecture occidentale gauche → droite). */}
          <div className="w-full max-w-md mx-auto text-center md:text-left md:mx-0 md:max-w-none">
            {/* H1 sur 2 lignes contrôlées : "Facture, envoie," sur la
                première (whitespace-nowrap empêche tout retour à la
                ligne intempestif si la col est étroite), "déclare." sur
                la seconde via <br/>. Tailles légèrement réduites par
                rapport à l'itération précédente pour garantir que la
                première ligne tienne sur toutes les résolutions. */}
            <h1 className="md:-mt-8 text-[2.5rem] md:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.75rem] leading-[1.05] font-extrabold tracking-tight text-ink-900">
              <span className="whitespace-nowrap">Facture, envoie,</span>
              <br />
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

          {/* Colonne droite — vidéo hero rendue avec Remotion (cf.
              dossier remotion/). Remplace l'ancien mockup CSS animé.
              Caché en mobile (le hero mobile reste centré sur l'auth).

              <video> : autoPlay + muted + playsInline = autoplay
              autorisé par les navigateurs ; loop pour boucler les 20 s.
              Source webm en premier (meilleure compression), mp4 en
              fallback pour les navigateurs sans support vp9.
              Le fond blanc (bg-surface) évite un flash noir avant que
              la vidéo soit décodée — la 1ʳᵉ frame est de toute façon
              claire. */}
          <div className="hidden md:block rounded-[24px] overflow-hidden ring-1 ring-ink-900/15 shadow-[0_30px_80px_-20px_rgba(11,13,18,0.35)] bg-surface">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster="/hero-poster.jpg"
              aria-label="Démonstration animée d'Asthia : choix de la couleur de l'interface, création d'une facture, aperçu du PDF, envoi au client et déclaration URSSAF automatique."
              className="block w-full h-auto"
            >
              <source src="/hero.webm" type="video/webm" />
              <source src="/hero.mp4" type="video/mp4" />
            </video>
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
