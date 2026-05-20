/**
 * Mockup animé du hero — split-card "saisie ↔ aperçu PDF en temps réel".
 *
 * Reflète la signature ergonomique du module de création de facture
 * d'Asthia (cf. app/(app)/invoices/.../form.tsx) : formulaire à gauche,
 * aperçu PDF live à droite qui s'actualise au fil de la saisie.
 *
 * Cycle de 6s (server component, CSS pur, aucun JS) :
 *   t=0.0s  panneaux visibles : form vide à gauche, squelette PDF à droite
 *   t=0.4s  champ "Client" se remplit → ligne "Dupont SARL" apparaît dans le PDF
 *   t=1.2s  champ "Désignation" se remplit → ligne d'article apparaît
 *   t=2.0s  champ "Montant" se remplit → prix et total apparaissent
 *   t=3.0s  bouton "Envoyer" pulse
 *   t=3.5s  bascule sur état "succès" (form remplacé par checkmark + résumé)
 *   t=5.5s  hold, puis reboucle
 *
 * Le champ TVA a été retiré (cf. audit du 20/05/2026) : il n'apporte pas
 * d'info dans une animation de 6s. À la place, la mention légale "TVA
 * non applicable, art. 293 B du CGI" apparaît en pied de PDF — montre
 * que la conformité M.E. est gérée automatiquement sans saisie.
 *
 * Responsive interne : split horizontal à partir de lg+, vertical
 * (form au-dessus, PDF en-dessous) au breakpoint md où la colonne
 * est trop étroite pour les deux côte à côte. Le mockup entier reste
 * masqué sur mobile via `hidden md:block` côté page.tsx.
 */
export function HeroMockup() {
  return (
    // Le halo radial qui détachait le mockup du fond clair a été retiré :
    // le wrapper sombre du parent (cf. app/page.tsx, bloc "vidéo") joue
    // maintenant ce rôle de cadre, avec un contraste bien plus fort.
    <div className="relative w-full">
      <div
        role="img"
        aria-label="Aperçu animé d'Asthia : à gauche, un formulaire de facture qui se remplit champ par champ ; à droite, le PDF de la facture qui se dessine en temps réel. Puis la facture est envoyée."
        // Liseré subtil (ring) + ombre douce plus prononcée que shadow-card
        // pour décoller le mockup du fond clair sans cadre épais.
        className="relative surface p-6 md:p-8 overflow-hidden ring-1 ring-ink-900/[0.06] shadow-[0_24px_64px_-20px_rgba(11,13,18,0.18)]"
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

        {/* Split-card : form / PDF.
            md : empilés verticalement (col étroite).
            lg+ : côte à côte. */}
        <div className="hero-content mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* ── Panneau form ────────────────────────────────────────── */}
          <div className="space-y-3">
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

            {/* Bouton "Envoyer" — pulse à t=3.0s (50% du cycle 6s) */}
            <div className="pt-1">
              <div className="hero-btn pill pill-primary w-full justify-center text-small font-medium">
                <span>Envoyer la facture</span>
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

          {/* ── Panneau PDF preview ─────────────────────────────────── */}
          {/* Mini-document A4-ish : fond blanc cassé, bord fin, typo
              compacte. Chaque ligne apparaît au moment où le champ
              correspondant se remplit dans le form. */}
          <div className="rounded-[10px] bg-white border border-divider p-3.5 text-[10px] leading-snug shadow-hair">
            {/* En-tête facture */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-ink-400">
                  Facture
                </p>
                <p className="font-bold text-ink-900 text-[11px] tabular-nums">
                  #2026-042
                </p>
              </div>
              <p className="text-[9px] text-ink-400 tabular-nums">15/05/2026</p>
            </div>

            {/* Bloc client — apparaît à t=0.4s */}
            <div
              className="hero-pdf-line mt-2.5"
              style={{ animationDelay: "0.4s" }}
            >
              <p className="font-medium text-ink-900 text-[10px]">
                Dupont SARL
              </p>
              <p className="text-[8px] text-ink-400">
                42 rue de Rivoli · 75001 Paris
              </p>
            </div>

            {/* Tableau ligne d'article — désignation à 1.2s, montant à 2.0s */}
            <div className="mt-3 pt-2 border-t border-divider">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="hero-pdf-line text-ink-700 text-[10px] truncate"
                  style={{ animationDelay: "1.2s" }}
                >
                  Audit conformité
                </span>
                <span
                  className="hero-pdf-line text-ink-900 text-[10px] tabular-nums shrink-0"
                  style={{ animationDelay: "2.0s" }}
                >
                  850,00 €
                </span>
              </div>
            </div>

            {/* Total — apparaît à t=2.4s */}
            <div className="mt-2 pt-2 border-t border-divider flex items-baseline justify-between">
              <span className="font-bold text-ink-900 text-[10px] uppercase tracking-wider">
                Total
              </span>
              <span
                className="hero-pdf-line font-bold text-ink-900 text-[11px] tabular-nums"
                style={{ animationDelay: "2.4s" }}
              >
                850,00 €
              </span>
            </div>

            {/* Mention légale TVA — apparaît dès le début, montre que la
                conformité M.E. est auto. Italique + très petit pour
                rester discret comme dans un vrai PDF de facture. */}
            <p className="mt-3 text-[7.5px] italic text-ink-400 leading-tight">
              TVA non applicable, art. 293 B du CGI
            </p>
          </div>
        </div>

        {/* ── Overlay succès ────────────────────────────────────────── */}
        {/* Empilé au-dessus du split-card, apparaît à t=3.5s.
            Sous-titre passé de text-small (13px) à text-body (15px) pour
            mieux équilibrer la composition avec le titre et le check. */}
        <div className="hero-success absolute inset-0 grid place-items-center p-6 bg-surface">
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
            <p className="mt-1 text-body text-ink-500">
              envoyée à Dupont SARL
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-small text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 inline-block" />
              URSSAF déclarée automatiquement
            </div>
          </div>
        </div>

        {/* Keyframes locales. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Champ form : invisible puis valeur qui s'écrit (fade + slide) */
              @keyframes hero-field-in {
                0%, 4%   { opacity: 0; transform: translateY(4px); }
                10%      { opacity: 1; transform: translateY(0); }
                90%      { opacity: 1; transform: translateY(0); }
                94%, 100%{ opacity: 0; transform: translateY(-4px); }
              }
              /* Caret clignotant pendant la "frappe" */
              @keyframes hero-caret-blink {
                0%, 30%  { opacity: 1; }
                50%      { opacity: 0; }
                70%, 100%{ opacity: 0; }
              }
              /* Tick vert d'autocomplete confirmé */
              @keyframes hero-tick-in {
                0%, 12%  { opacity: 0; transform: scale(0.5); }
                20%      { opacity: 1; transform: scale(1); }
                100%     { opacity: 1; transform: scale(1); }
              }
              /* Bouton "Envoyer" : pulse à 50% du cycle (t=3s sur 6s) */
              @keyframes hero-btn-pulse {
                0%, 42%  { transform: scale(1); box-shadow: var(--shadow-pop); }
                50%      { transform: scale(1.04); box-shadow: 0 12px 36px rgba(47,107,255,0.32); }
                56%      { transform: scale(0.98); }
                62%, 100%{ transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              /* Le contenu (form + PDF) disparaît à t=3.5s, réapparaît à t=5.5s */
              @keyframes hero-content-out {
                0%, 56%  { opacity: 1; transform: translateY(0); }
                63%      { opacity: 0; transform: translateY(-8px); }
                92%      { opacity: 0; transform: translateY(-8px); }
                100%     { opacity: 1; transform: translateY(0); }
              }
              /* Overlay succès : invisible jusqu'à t=3.5s, visible 2s, fondu */
              @keyframes hero-success-in {
                0%, 58%  { opacity: 0; transform: scale(0.96); pointer-events: none; }
                65%      { opacity: 1; transform: scale(1); }
                92%      { opacity: 1; transform: scale(1); }
                97%, 100%{ opacity: 0; transform: scale(0.98); }
              }
              /* Check qui se dessine */
              @keyframes hero-check-draw {
                0%, 58%  { stroke-dasharray: 30; stroke-dashoffset: 30; }
                66%      { stroke-dasharray: 30; stroke-dashoffset: 0; }
                100%     { stroke-dasharray: 30; stroke-dashoffset: 0; }
              }
              /* Lignes du PDF : apparaissent puis restent visibles
                 jusqu'à la transition (uniformité avec le form). */
              @keyframes hero-pdf-in {
                0%, 4%   { opacity: 0; transform: translateY(3px); }
                10%      { opacity: 1; transform: translateY(0); }
                90%      { opacity: 1; transform: translateY(0); }
                94%, 100%{ opacity: 0; transform: translateY(-3px); }
              }

              .hero-field   { animation: hero-field-in 6s ease-in-out infinite both; }
              .hero-caret   { animation: hero-caret-blink 6s linear infinite both; }
              .hero-tick    { animation: hero-tick-in 6s ease-out infinite both; }
              .hero-btn     { animation: hero-btn-pulse 6s ease-in-out infinite both; }
              .hero-content { animation: hero-content-out 6s ease-in-out infinite both; }
              .hero-success { animation: hero-success-in 6s ease-out infinite both; }
              .hero-check   { animation: hero-check-draw 6s ease-out infinite both; }
              .hero-pdf-line{ animation: hero-pdf-in 6s ease-in-out infinite both; }

              @media (prefers-reduced-motion: reduce) {
                .hero-field, .hero-caret, .hero-tick, .hero-btn,
                .hero-content, .hero-success, .hero-check, .hero-pdf-line {
                  animation: none !important;
                }
                .hero-content { opacity: 0; }
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
 * Champ du formulaire fake. Inputs avec radius volontairement plus
 * serré (rounded-[10px] / radius-sm) que la card mère pour épurer
 * l'intérieur — cf. audit du 20/05/2026.
 *
 * Les `--d-*` décalent les keyframes enfants (caret, tick) selon le
 * delay du champ parent, pour que le caret blinque AU MOMENT où le
 * champ apparaît, pas au début du cycle global.
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
      <p className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">
        {label}
      </p>
      <div className="relative h-10 rounded-[10px] bg-surface-2 px-3 flex items-center">
        <span
          className={
            "hero-field text-small text-ink-900 " +
            (mono ? "tabular-nums font-medium" : "")
          }
          style={{ animationDelay: `${delay - 0.6}s` }}
        >
          {value}
        </span>
        <span
          aria-hidden
          className="hero-caret ml-0.5 inline-block h-4 w-[2px] bg-brand-500 align-middle"
          style={{ animationDelay: `${delay - 0.6}s` }}
        />
        {withCheck ? (
          <span
            aria-hidden
            className="hero-tick ml-auto inline-flex items-center justify-center h-4 w-4 rounded-full bg-success-500/15 text-success-600 text-[9px] font-bold"
            style={{ animationDelay: `${delay - 0.4}s` }}
          >
            ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}
