/**
 * Mockup animé du hero — création rapide de facture.
 *
 * Inspiré du widget claude.ai (carte avec étapes qui se passent toutes
 * seules) mais transposé sur le pain quotidien d'un auto-entrepreneur :
 * créer une facture en quelques secondes, sans réfléchir.
 *
 * Scénario (cycle de 6s) :
 *   t=0.0s  carte vide, en-tête "Nouvelle facture"
 *   t=0.4s  champ "Client" se remplit → Dupont SARL
 *   t=1.2s  champ "Désignation" se remplit → Audit conformité
 *   t=2.0s  champ "Montant" se remplit → 850,00 €
 *   t=2.8s  champ "TVA" se remplit → Non applicable (M.E.)
 *   t=3.4s  bouton "Créer & envoyer" pulse
 *   t=3.9s  overlay succès apparaît → "Facture #2026-042 envoyée"
 *   t=5.5s  fondu et reboucle
 *
 * Tout en CSS pur (keyframes + animation-delay), aucun JS. Server
 * component. `prefers-reduced-motion` désactive l'animation et affiche
 * l'état final figé.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full">
      {/* Halo bleu derrière la carte — rappelle shadow-pop sans surcharger. */}
      <div
        aria-hidden
        className="absolute -inset-6 hidden md:block rounded-[36px] bg-brand-500/[0.06] blur-2xl"
      />

      <div
        role="img"
        aria-label="Aperçu animé : création d'une facture dans Asthia en moins de cinq secondes, puis envoi automatique au client."
        className="relative surface p-6 md:p-7 overflow-hidden"
      >
        {/* En-tête mac-window style */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
          </div>
          <span className="text-xs text-ink-400">Asthia · Nouvelle facture</span>
        </div>

        {/* Conteneur du formulaire — disparaît au moment du succès */}
        <div className="hero-form mt-5 space-y-3.5">
          <FormField
            label="Client"
            value="Dupont SARL"
            delay={0.4}
            withCheck
          />
          <FormField
            label="Désignation"
            value="Audit conformité"
            delay={1.2}
          />
          <FormField
            label="Montant HT"
            value="850,00 €"
            delay={2.0}
            mono
          />
          <FormField
            label="TVA"
            value="Non applicable (M.E.)"
            delay={2.8}
          />

          {/* Bouton "Créer & envoyer" — pulse à 3.4s */}
          <div className="hero-btn-wrap pt-2">
            <div className="hero-btn pill pill-primary w-full justify-center text-small font-medium">
              <span>Créer &amp; envoyer</span>
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
          </div>
        </div>

        {/* Overlay de succès — empilé au-dessus, apparaît à t=3.9s.
            Centré dans la carte avec position absolute + grid place. */}
        <div className="hero-success absolute inset-0 grid place-items-center p-6">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-success-500/15 grid place-items-center">
              <svg
                width="28"
                height="28"
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
            <p className="mt-4 text-h2 font-semibold text-ink-900">
              Facture #2026-042
            </p>
            <p className="mt-1 text-small text-ink-500">
              envoyée à Dupont SARL
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 inline-block" />
              URSSAF déclarée automatiquement
            </div>
          </div>
        </div>

        {/* Keyframes locales — server component compatible (pas de jsx). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Champs : invisibles puis valeur qui s'écrit (slide depuis le bas + fade) */
              @keyframes hero-field-in {
                0%, 4%   { opacity: 0; transform: translateY(4px); }
                10%      { opacity: 1; transform: translateY(0); }
                90%      { opacity: 1; transform: translateY(0); }
                94%, 100%{ opacity: 0; transform: translateY(-4px); }
              }
              /* Caret clignotant pendant la "frappe" — uniquement quand le champ vient d'apparaître */
              @keyframes hero-caret-blink {
                0%, 30%  { opacity: 1; }
                50%      { opacity: 0; }
                70%, 100%{ opacity: 0; }
              }
              /* Tick vert qui apparaît à la fin du remplissage (autocomplete confirmé) */
              @keyframes hero-tick-in {
                0%, 12%  { opacity: 0; transform: scale(0.5); }
                20%      { opacity: 1; transform: scale(1); }
                100%     { opacity: 1; transform: scale(1); }
              }
              /* Bouton : pulse à t=3.4s (donc 56% du cycle 6s) */
              @keyframes hero-btn-pulse {
                0%, 50%  { transform: scale(1); box-shadow: var(--shadow-pop); }
                57%      { transform: scale(1.04); box-shadow: 0 12px 36px rgba(47,107,255,0.32); }
                64%      { transform: scale(0.98); }
                70%, 100%{ transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              /* Formulaire entier : disparaît à t=3.9s (65%) après le pulse du bouton */
              @keyframes hero-form-out {
                0%, 60%  { opacity: 1; transform: translateY(0); }
                68%      { opacity: 0; transform: translateY(-8px); }
                92%      { opacity: 0; transform: translateY(-8px); }
                100%     { opacity: 1; transform: translateY(0); }
              }
              /* Overlay succès : invisible jusqu'à t=3.9s, visible 1.6s, puis disparaît */
              @keyframes hero-success-in {
                0%, 64%  { opacity: 0; transform: scale(0.96); pointer-events: none; }
                70%      { opacity: 1; transform: scale(1); }
                92%      { opacity: 1; transform: scale(1); }
                97%, 100%{ opacity: 0; transform: scale(0.98); }
              }
              /* Le tick qui se dessine dans le rond vert */
              @keyframes hero-check-draw {
                0%, 64%  { stroke-dasharray: 30; stroke-dashoffset: 30; }
                72%      { stroke-dasharray: 30; stroke-dashoffset: 0; }
                100%     { stroke-dasharray: 30; stroke-dashoffset: 0; }
              }

              .hero-field { animation: hero-field-in 6s ease-in-out infinite both; }
              .hero-caret { animation: hero-caret-blink 6s linear infinite both; }
              .hero-tick  { animation: hero-tick-in 6s ease-out infinite both; }
              .hero-btn   { animation: hero-btn-pulse 6s ease-in-out infinite both; }
              .hero-form  { animation: hero-form-out 6s ease-in-out infinite both; }
              .hero-success { animation: hero-success-in 6s ease-out infinite both; }
              .hero-check { animation: hero-check-draw 6s ease-out infinite both; }

              @media (prefers-reduced-motion: reduce) {
                .hero-field, .hero-caret, .hero-tick, .hero-btn,
                .hero-form, .hero-success, .hero-check {
                  animation: none !important;
                }
                /* Affichage statique = état "succès" final, le plus clair */
                .hero-form { opacity: 0; }
                .hero-success { opacity: 1; }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Un champ du formulaire fake.
 *
 * - `delay` : moment où le champ se remplit (en secondes, dans le cycle de 6s)
 * - `withCheck` : tick vert d'autocomplete (utilisé sur "Client")
 * - `mono` : police tabular pour les montants
 *
 * Les `--d-*` sont des CSS variables qui décalent les keyframes enfants
 * (caret, tick) selon le delay du champ parent — pour que le caret
 * blinque AU MOMENT où le champ apparaît, pas au début du cycle global.
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
      <p className="text-xs text-ink-500 mb-1.5">{label}</p>
      <div className="relative h-11 rounded-[14px] bg-surface-2 px-3.5 flex items-center">
        <span
          className={
            "hero-field text-small text-ink-900 " +
            (mono ? "tabular-nums font-medium" : "")
          }
          style={{ animationDelay: `${delay - 0.6}s` }}
        >
          {value}
        </span>
        {/* Caret juste après la valeur — apparaît au début du champ
            puis s'éteint, donne l'impression que le texte vient d'être
            tapé. */}
        <span
          aria-hidden
          className="hero-caret ml-0.5 inline-block h-4 w-[2px] bg-brand-500 align-middle"
          style={{ animationDelay: `${delay - 0.6}s` }}
        />
        {withCheck ? (
          <span
            aria-hidden
            className="hero-tick ml-auto inline-flex items-center justify-center h-5 w-5 rounded-full bg-success-500/15 text-success-600 text-[10px] font-bold"
            style={{ animationDelay: `${delay - 0.4}s` }}
          >
            ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}
