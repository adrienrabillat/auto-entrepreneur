/**
 * Mockup animé du hero — simule le flux Asthia en action.
 *
 * Inspiré du widget "Progress" de claude.ai (carte sombre avec étapes
 * qui se cochent une à une) mais transposé sur l'ADN Asthia :
 *  - Carte surface blanche (ou surface dark en thème sombre)
 *  - Status-dots déjà définis dans globals.css (.paid / .sent / .draft)
 *  - Typo Inter, radius 24px, shadow-card
 *
 * Tout est en CSS pur (keyframes + animation-delay) — pas de JS, pas de
 * vidéo. Côté server component : aucun "use client" nécessaire. Le bloc
 * <style> est inline pour garder le composant auto-contenu (pas de
 * pollution de globals.css avec des classes one-shot).
 *
 * Cycle de 9s : les 4 étapes apparaissent successivement (0s, 2s, 4s,
 * 6s) puis tout reste affiché 3s avant de boucler. Volontairement lent
 * pour laisser le temps de lire — on n'est pas sur une démo gaming.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full">
      {/* Halo bleu discret derrière la carte — rappelle le shadow-pop
          sans surcharger. Désactivé en mobile pour éviter le clipping. */}
      <div
        aria-hidden
        className="absolute -inset-6 hidden md:block rounded-[36px] bg-brand-500/[0.06] blur-2xl"
      />

      <div
        role="img"
        aria-label="Aperçu animé d'une facture Asthia qui passe par les étapes Brouillon, Envoyée, Payée et URSSAF déclarée."
        className="relative surface p-6 md:p-7"
      >
        {/* En-tête de la fausse carte — petit chrome type 'mac window' */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
          </div>
          <span className="text-xs text-ink-400">Asthia · Aperçu</span>
        </div>

        {/* Carte "Encaissé ce mois" — le seul chiffre qui compte
            visuellement, anime le compteur de 0 → 4 280 € via un
            simple keyframe sur la marge / opacité. */}
        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-500">Encaissé ce mois</p>
              <p className="mt-1 text-h1 font-bold tracking-tight text-ink-900 tabular-nums">
                4 280 <span className="text-ink-500 font-semibold">€</span>
              </p>
            </div>
            <span className="status-dot paid">
              <span className="d" /> +12 %
            </span>
          </div>

          {/* Mini-barres mensuelles — purement décoratif, donne du
              "produit" à la carte sans alourdir. Animation : chaque
              barre pousse depuis 0 → sa hauteur cible. */}
          <div className="mt-4 flex items-end gap-1.5 h-10">
            {[35, 50, 42, 65, 80, 95].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-md bg-brand-500/20 hero-bar"
                style={{
                  // CSS variable lue par le keyframe `hero-bar-grow`
                  ['--h' as string]: `${h}%`,
                  animationDelay: `${0.2 + i * 0.12}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Bloc "Facture en cours" — les 4 étapes qui se cochent */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-small font-semibold text-ink-900">
              Facture #2026-042
            </p>
            <p className="text-xs text-ink-500">Dupont SARL · 850 €</p>
          </div>

          <ul className="mt-4 space-y-3">
            <HeroStep delay={0}   label="Facture créée"            time="il y a 4 min" />
            <HeroStep delay={2}   label="Envoyée par email"        time="il y a 3 min" />
            <HeroStep delay={4}   label="Paiement reçu · 850 €"    time="il y a 1 min" />
            <HeroStep delay={6}   label="URSSAF déclarée"          time="à l'instant"  last />
          </ul>
        </div>

        {/* Keyframes locales — `style jsx` n'est pas dispo en server
            component, donc on injecte du CSS via <style> standard. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes hero-step-in {
                0%, 5%   { opacity: 0; transform: translateY(6px); }
                15%      { opacity: 1; transform: translateY(0); }
                100%     { opacity: 1; transform: translateY(0); }
              }
              @keyframes hero-dot-fill {
                0%, 10%  { background: rgb(var(--c-ink-4)); box-shadow: 0 0 0 3px rgba(138,143,156,0.15); }
                25%      { background: rgb(var(--c-amber)); box-shadow: 0 0 0 3px var(--amber-soft); }
                40%, 100%{ background: rgb(var(--c-green)); box-shadow: 0 0 0 3px var(--green-soft); }
              }
              @keyframes hero-bar-grow {
                0%   { height: 0; }
                100% { height: var(--h); }
              }
              .hero-step {
                animation: hero-step-in 9s ease-out infinite both;
              }
              .hero-step .dot {
                animation: hero-dot-fill 9s ease-out infinite both;
              }
              .hero-bar {
                height: 0;
                animation: hero-bar-grow 1.2s cubic-bezier(.16,1,.3,1) both;
              }
              /* Respect du prefers-reduced-motion : on désactive
                 tout, on affiche l'état final immédiatement. */
              @media (prefers-reduced-motion: reduce) {
                .hero-step, .hero-step .dot, .hero-bar {
                  animation: none !important;
                }
                .hero-bar { height: var(--h); }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Une ligne d'étape. Le delay est exprimé en secondes côté API du
 * composant pour rester lisible (delay={2}, delay={4}, …) — converti
 * en `animation-delay` directement.
 */
function HeroStep({
  delay,
  label,
  time,
  last = false,
}: {
  delay: number;
  label: string;
  time: string;
  last?: boolean;
}) {
  return (
    <li
      className="hero-step flex items-center gap-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <span
        className="dot relative inline-block h-2.5 w-2.5 rounded-full shrink-0"
        style={{ animationDelay: `${delay}s` }}
      />
      <span className="flex-1 text-small text-ink-700">{label}</span>
      <span className="text-xs text-ink-400 tabular-nums">{time}</span>
      {/* Le `last` est passé mais pas utilisé visuellement pour le
          moment — placeholder pour ajouter un séparateur si on enrichit
          le mockup. */}
      {last ? null : null}
    </li>
  );
}
