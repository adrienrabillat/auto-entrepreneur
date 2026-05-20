/**
 * Mockup animé du hero — 3 états séquentiels qui racontent une histoire
 * simple : "voici comment on fait une facture avec Asthia."
 *
 * Cycle de 8 secondes :
 *   t=0.0s → 2.5s    ÉTAT 1 — Formulaire
 *     • Champs Client / Désignation / Montant se remplissent un par un
 *     • À 2.0s un curseur souris descend vers le bouton "Créer"
 *     • À 2.3s clic (pulse sur le bouton)
 *
 *   t=2.7s → 4.7s    ÉTAT 2 — Aperçu PDF
 *     • Le PDF complet de la facture s'affiche (en-tête, client,
 *       ligne d'article, total, mention TVA légale)
 *     • À 4.2s curseur souris descend vers "Envoyer au client"
 *     • À 4.5s clic
 *
 *   t=4.9s → 7.3s    ÉTAT 3 — Succès
 *     • Gros checkmark vert
 *     • "Facture envoyée à Dupont SARL"
 *     • "URSSAF déclarée automatiquement"
 *
 *   t=7.5s → 8.0s    reboucle sur l'ÉTAT 1
 *
 * Les 3 états sont en position absolute, empilés. Chaque état a une
 * keyframe propre qui contrôle son opacité dans le cycle global.
 * Hauteur fixe (~520 px) pour qu'il n'y ait pas de saut de layout
 * entre les transitions.
 *
 * Tout en CSS pur, server component, prefers-reduced-motion respecté.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full">
      <div
        role="img"
        aria-label="Aperçu animé d'Asthia : un auto-entrepreneur saisit une facture (client, désignation, montant), clique sur Créer, voit l'aperçu PDF, clique sur Envoyer, et reçoit la confirmation que la facture est envoyée et l'URSSAF déclarée automatiquement."
        className="relative surface overflow-hidden ring-1 ring-ink-900/[0.05]"
      >
        {/* En-tête mac-window (toujours visible) */}
        <div className="flex items-center justify-between px-6 md:px-7 py-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
          </div>
          <span className="text-xs text-ink-400 tabular-nums">
            asthia.app / nouvelle-facture
          </span>
          <span className="w-12" aria-hidden />
        </div>

        {/* Zone des 3 états — hauteur fixe pour éviter les sauts */}
        <div className="relative h-[460px] md:h-[500px]">
          {/* ──────────────────────────────────────────────────────── */}
          {/* ÉTAT 1 — Formulaire                                       */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="hero-state hero-s1 absolute inset-0 p-6 md:p-7">
            <div className="flex items-baseline justify-between mb-5">
              <p className="text-h3 font-semibold text-ink-900">
                Nouvelle facture
              </p>
              <p className="text-xs text-ink-400 tabular-nums">#2026-042</p>
            </div>

            <div className="space-y-4">
              <FormField
                label="Client"
                value="Dupont SARL"
                delay={0.4}
                withCheck
              />
              <FormField
                label="Désignation"
                value="Audit conformité"
                delay={1.0}
              />
              <FormField
                label="Montant HT"
                value="850,00 €"
                delay={1.6}
                mono
              />
            </div>

            {/* Bouton Créer + curseur 1 */}
            <div className="absolute left-6 right-6 md:left-7 md:right-7 bottom-6 md:bottom-7">
              <div className="relative">
                <div className="hero-btn-1 pill pill-primary w-full justify-center text-small font-medium">
                  <span>Créer la facture</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Curseur 1 : descend vers le bouton, clique à 2.3s */}
                <Cursor variant="one" />
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* ÉTAT 2 — Aperçu PDF                                       */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="hero-state hero-s2 absolute inset-0 p-6 md:p-7">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-h3 font-semibold text-ink-900">
                Aperçu de la facture
              </p>
              <p className="text-xs text-ink-400">prête à envoyer</p>
            </div>

            {/* Document PDF — taille généreuse pour bien voir */}
            <div className="rounded-[12px] bg-white border border-divider p-5 shadow-hair">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">
                    Facture
                  </p>
                  <p className="font-bold text-ink-900 text-h3 tabular-nums">
                    #2026-042
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">
                    Émise le
                  </p>
                  <p className="text-small text-ink-700 tabular-nums">
                    15/05/2026
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-divider">
                <p className="font-semibold text-ink-900 text-small">
                  Dupont SARL
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  42 rue de Rivoli · 75001 Paris
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-divider">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-small text-ink-800">
                    Audit conformité
                  </span>
                  <span className="text-small text-ink-900 tabular-nums font-medium shrink-0">
                    850,00 €
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t-2 border-ink-900/10 flex items-baseline justify-between">
                <span className="font-bold text-ink-900 text-small uppercase tracking-wider">
                  Total HT
                </span>
                <span className="font-bold text-ink-900 text-h3 tabular-nums">
                  850,00 €
                </span>
              </div>

              <p className="mt-3 text-[10px] italic text-ink-400 leading-tight">
                TVA non applicable, art. 293 B du CGI
              </p>
            </div>

            {/* Bouton Envoyer + curseur 2 */}
            <div className="absolute left-6 right-6 md:left-7 md:right-7 bottom-6 md:bottom-7">
              <div className="relative">
                <div className="hero-btn-2 pill pill-primary w-full justify-center text-small font-medium">
                  <span>Envoyer au client</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>

                <Cursor variant="two" />
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* ÉTAT 3 — Succès                                           */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="hero-state hero-s3 absolute inset-0 grid place-items-center p-6 md:p-7">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-success-500/15 grid place-items-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(var(--c-green))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="hero-check"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-5 text-h1 font-bold text-ink-900">
                Facture envoyée
              </p>
              <p className="mt-1 text-body text-ink-500">à Dupont SARL</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-success-500/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500 inline-block" />
                <span className="text-small text-success-600 font-medium">
                  URSSAF déclarée automatiquement
                </span>
              </div>
            </div>
          </div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* ─── ÉTATS ──────────────────────────────────────────
                 Cycle global de 8s. Pourcentages clés :
                  0-31%   (0-2.5s)   État 1 visible
                  31-34%  (2.5-2.7s) Transition 1→2
                  34-59%  (2.7-4.7s) État 2 visible
                  59-61%  (4.7-4.9s) Transition 2→3
                  61-91%  (4.9-7.3s) État 3 visible
                  91-94%  (7.3-7.5s) Transition 3→1
                  94-100% (7.5-8s)   État 1 visible (cycle suivant) */
              @keyframes hero-s1 {
                0%, 28%      { opacity: 1; }
                34%, 92%     { opacity: 0; }
                97%, 100%    { opacity: 1; }
              }
              @keyframes hero-s2 {
                0%, 28%      { opacity: 0; }
                34%, 58%     { opacity: 1; }
                64%, 100%    { opacity: 0; }
              }
              @keyframes hero-s3 {
                0%, 58%      { opacity: 0; }
                64%, 91%     { opacity: 1; }
                97%, 100%    { opacity: 0; }
              }
              .hero-s1 { animation: hero-s1 8s ease-in-out infinite both; }
              .hero-s2 { animation: hero-s2 8s ease-in-out infinite both; }
              .hero-s3 { animation: hero-s3 8s ease-in-out infinite both; }

              /* ─── CHAMPS FORM (ÉTAT 1) ───────────────────────────
                 Chaque champ se "remplit" via fade + slide. Visible
                 dès son delay jusqu'à ~30% (la fin de l'état 1). */
              @keyframes hero-field {
                0%, 3%   { opacity: 0; transform: translateY(4px); }
                7%       { opacity: 1; transform: translateY(0); }
                100%     { opacity: 1; transform: translateY(0); }
              }
              .hero-field { animation: hero-field 8s ease-out infinite both; }

              /* Caret clignotant pendant la "frappe" */
              @keyframes hero-caret {
                0%, 2%   { opacity: 0; }
                3%, 5%   { opacity: 1; }
                6%, 8%   { opacity: 0; }
                9%       { opacity: 1; }
                10%, 100%{ opacity: 0; }
              }
              .hero-caret { animation: hero-caret 8s linear infinite both; }

              /* Tick d'autocomplete client */
              @keyframes hero-tick {
                0%, 6%   { opacity: 0; transform: scale(0.5); }
                10%      { opacity: 1; transform: scale(1); }
                100%     { opacity: 1; transform: scale(1); }
              }
              .hero-tick { animation: hero-tick 8s ease-out infinite both; }

              /* ─── BOUTONS ───────────────────────────────────────
                 Bouton 1 "Créer" pulse à 2.3s = 28.75% du cycle 8s
                 Bouton 2 "Envoyer" pulse à 4.5s = 56.25% */
              @keyframes hero-btn-1 {
                0%, 26%  { transform: scale(1); box-shadow: var(--shadow-pop); }
                29%      { transform: scale(0.96); box-shadow: 0 4px 12px rgba(47,107,255,0.4); }
                32%, 100%{ transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              @keyframes hero-btn-2 {
                0%, 54%  { transform: scale(1); box-shadow: var(--shadow-pop); }
                57%      { transform: scale(0.96); box-shadow: 0 4px 12px rgba(47,107,255,0.4); }
                60%, 100%{ transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              .hero-btn-1 { animation: hero-btn-1 8s ease-out infinite both; }
              .hero-btn-2 { animation: hero-btn-2 8s ease-out infinite both; }

              /* ─── CURSEURS SOURIS ───────────────────────────────
                 Curseur 1 (état 1) :
                  - invisible 0-22%
                  - apparait et descend de droite vers le bouton 22-28%
                  - clique (scale down) à 29%
                  - disparaît avec l'état 1 à 31%

                 Curseur 2 (état 2) :
                  - invisible 0-50%
                  - apparait et descend vers le bouton 50-56%
                  - clique à 57%
                  - disparaît avec l'état 2 à 59% */
              @keyframes hero-cursor-1 {
                0%, 20%      { opacity: 0; transform: translate(60px, -30px) scale(1); }
                23%          { opacity: 1; transform: translate(30px, -15px) scale(1); }
                28%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                29%          { opacity: 1; transform: translate(0px, 0px) scale(0.85); }
                30%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                32%, 100%    { opacity: 0; transform: translate(0px, 0px) scale(1); }
              }
              @keyframes hero-cursor-2 {
                0%, 48%      { opacity: 0; transform: translate(60px, -30px) scale(1); }
                51%          { opacity: 1; transform: translate(30px, -15px) scale(1); }
                56%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                57%          { opacity: 1; transform: translate(0px, 0px) scale(0.85); }
                58%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                60%, 100%    { opacity: 0; transform: translate(0px, 0px) scale(1); }
              }
              .hero-cursor-1 { animation: hero-cursor-1 8s cubic-bezier(.4,0,.2,1) infinite both; }
              .hero-cursor-2 { animation: hero-cursor-2 8s cubic-bezier(.4,0,.2,1) infinite both; }

              /* Checkmark de succès — se dessine à 64% */
              @keyframes hero-check {
                0%, 60%   { stroke-dasharray: 30; stroke-dashoffset: 30; }
                68%       { stroke-dasharray: 30; stroke-dashoffset: 0; }
                100%      { stroke-dasharray: 30; stroke-dashoffset: 0; }
              }
              .hero-check { animation: hero-check 8s ease-out infinite both; }

              @media (prefers-reduced-motion: reduce) {
                .hero-s1, .hero-s2, .hero-s3,
                .hero-field, .hero-caret, .hero-tick,
                .hero-btn-1, .hero-btn-2,
                .hero-cursor-1, .hero-cursor-2, .hero-check {
                  animation: none !important;
                }
                /* Affiche l'état succès figé — le plus parlant */
                .hero-s1, .hero-s2 { opacity: 0; }
                .hero-s3 { opacity: 1; }
                .hero-check { stroke-dashoffset: 0; }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Champ de formulaire fake animé. Apparaît au moment de son `delay`
 * (en pourcentage du cycle 8s, géré via animation-delay).
 *
 * - `delay` (secondes) : timing d'apparition dans le cycle global
 * - `withCheck` : tick vert d'autocomplete (Client)
 * - `mono` : police tabular (montants)
 */
function FormField({
  label,
  value,
  delay,
  withCheck = false,
  mono = false,
}: {
  label: string;
  value: string;
  delay: number;
  withCheck?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-1.5">
        {label}
      </p>
      <div className="relative h-11 rounded-[12px] bg-surface-2 px-3.5 flex items-center">
        <span
          className={
            "hero-field text-small text-ink-900 " +
            (mono ? "tabular-nums font-medium" : "")
          }
          style={{ animationDelay: `${delay - 0.55}s` }}
        >
          {value}
        </span>
        <span
          aria-hidden
          className="hero-caret ml-0.5 inline-block h-4 w-[2px] bg-brand-500 align-middle"
          style={{ animationDelay: `${delay - 0.55}s` }}
        />
        {withCheck ? (
          <span
            aria-hidden
            className="hero-tick ml-auto inline-flex items-center justify-center h-5 w-5 rounded-full bg-success-500/15 text-success-600 text-[10px] font-bold"
            style={{ animationDelay: `${delay - 0.3}s` }}
          >
            ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Curseur souris SVG positionné absolu, qui descend vers le bouton
 * et "clique" (pulse scale). Deux variantes : "one" pour l'état 1
 * (clic sur Créer), "two" pour l'état 2 (clic sur Envoyer).
 *
 * Le curseur est positionné au coin bas-droit du bouton (sa position
 * "cliquée"). Les keyframes le font apparaître plus haut-à-droite et
 * descendre jusqu'à cette position.
 */
function Cursor({ variant }: { variant: "one" | "two" }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute -top-1 right-[20%] " +
        (variant === "one" ? "hero-cursor-1" : "hero-cursor-2")
      }
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        // Petite ombre portée pour bien faire ressortir le curseur sur
        // fond clair, sans qu'il ait l'air d'un sticker plat.
        style={{ filter: "drop-shadow(0 2px 4px rgba(11,13,18,0.25))" }}
      >
        {/* Forme de curseur "flèche" classique macOS — outline noire,
            fill blanc, pointe en haut à gauche. */}
        <path
          d="M5.5 3.5 L5.5 17.5 L9.2 14 L11.5 19.5 L13.8 18.4 L11.5 13 L16.5 13 Z"
          fill="white"
          stroke="rgb(11,13,18)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
