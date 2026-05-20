/**
 * Mockup animé du hero — 3 états séquentiels sur un cycle de 12s.
 *
 * Storytelling :
 *   t=0.0s → 4.4s    ÉTAT 1 — Formulaire avec effet de typing
 *     • Champ Client : "Dupont SARL" se tape lettre par lettre (clip-path)
 *     • Champ Désignation : "Audit conformité" se tape
 *     • Champ Montant : "850,00 €" se tape
 *     • Un caret clignote pendant chaque saisie
 *     • À ~3.7s un curseur souris descend vers "Créer la facture"
 *     • Clic à 4.1s
 *
 *   t=4.7s → 7.6s    ÉTAT 2 — Aperçu PDF réaliste
 *     • Vraie facture style Asthia : en-tête émetteur (auto-entrepreneur),
 *       bloc "Facturé à", tableau article (Qté/PU/Total), totaux
 *       structurés (HT/mention TVA/TTC), pied avec IBAN et mention
 *       légale CGI.
 *     • Curseur souris descend vers "Envoyer au client" à 6.8s
 *     • Clic à 7.2s
 *
 *   t=7.9s → 11.2s   ÉTAT 3 — Succès
 *     • Gros checkmark vert qui se dessine
 *     • "Facture envoyée" + "à Dupont SARL"
 *     • Pill "URSSAF déclarée automatiquement"
 *
 *   t=11.5s → 12s    Reboucle sur l'ÉTAT 1
 *
 * Hauteur du mockup volontairement généreuse (~620-680 px) pour que
 * le PDF de l'état 2 ressemble vraiment à une facture lisible — pas
 * un thumbnail miniature.
 *
 * Tout en CSS pur. Server component. prefers-reduced-motion respecté.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full">
      <div
        role="img"
        aria-label="Aperçu animé d'Asthia : un auto-entrepreneur saisit une facture (client, désignation, montant) en la voyant se taper champ par champ, clique sur Créer, voit l'aperçu PDF d'une vraie facture, clique sur Envoyer, et reçoit la confirmation que la facture est envoyée avec déclaration URSSAF automatique."
        className="relative surface overflow-hidden"
      >
        {/* En-tête mac-window (toujours visible, fait partie du "chrome"
            du mockup) */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-divider">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
          </div>
          <span className="text-xs text-ink-400 tabular-nums">
            asthia.app / factures / nouvelle
          </span>
          <span className="w-12" aria-hidden />
        </div>

        {/* Zone des 3 états — hauteur fixe (+30-40% vs itération précédente
            pour laisser le PDF respirer) */}
        <div className="relative h-[600px] md:h-[660px]">
          {/* ──────────────────────────────────────────────────────── */}
          {/* ÉTAT 1 — Formulaire                                       */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="hero-state hero-s1 absolute inset-0 px-6 md:px-7 pt-6 md:pt-7 pb-20 md:pb-24">
            <div className="flex items-baseline justify-between mb-6">
              <p className="text-h2 font-semibold text-ink-900">
                Nouvelle facture
              </p>
              <p className="text-xs text-ink-400 tabular-nums">#2026-042</p>
            </div>

            <div className="space-y-5">
              <TypingField
                label="Client"
                value="Dupont SARL"
                typingStart={0.5}
                typingEnd={1.3}
                withCheck
              />
              <TypingField
                label="Désignation"
                value="Audit conformité"
                typingStart={1.7}
                typingEnd={2.8}
              />
              <TypingField
                label="Montant HT"
                value="850,00 €"
                typingStart={3.1}
                typingEnd={3.5}
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

                <Cursor variant="one" />
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* ÉTAT 2 — Aperçu PDF réaliste                              */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="hero-state hero-s2 absolute inset-0 px-5 md:px-6 pt-5 md:pt-6 pb-20 md:pb-24">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-small font-semibold text-ink-900">
                Aperçu de la facture
              </p>
              <p className="text-xs text-ink-400">prête à envoyer</p>
            </div>

            {/* Document PDF — design proche d'une vraie facture
                générée par Asthia. Fond papier blanc, typo serrée,
                hiérarchie d'info : émetteur / destinataire / lignes /
                totaux / mention légale / IBAN. */}
            <div className="rounded-[10px] bg-white border border-divider px-4 py-4 shadow-[0_2px_8px_rgba(11,13,18,0.04)] h-[calc(100%-32px)] overflow-hidden">
              {/* Bandeau d'en-tête : wordmark + numéro + dates */}
              <div className="flex items-start justify-between pb-3 border-b border-ink-900/10">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-ink-400">
                    Facture
                  </p>
                  <p className="font-bold text-ink-900 text-[15px] tabular-nums mt-0.5">
                    #2026-042
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-ink-400">
                    Émise le
                  </p>
                  <p className="text-[11px] text-ink-800 tabular-nums mt-0.5">
                    15/05/2026
                  </p>
                  <p className="text-[9px] text-ink-400 mt-0.5">
                    Échéance · 14/06/2026
                  </p>
                </div>
              </div>

              {/* Bloc émetteur / destinataire — colonnes */}
              <div className="grid grid-cols-2 gap-4 mt-3 pb-3 border-b border-ink-900/10">
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-ink-400 mb-1">
                    Émetteur
                  </p>
                  <p className="text-[11px] font-semibold text-ink-900">
                    Jean Dupuis
                  </p>
                  <p className="text-[9px] text-ink-500 leading-snug">
                    Auto-entrepreneur
                    <br />
                    12 rue de la République
                    <br />
                    69001 Lyon
                  </p>
                  <p className="text-[8px] text-ink-400 mt-1 tabular-nums">
                    SIRET 123 456 789 00012
                  </p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-ink-400 mb-1">
                    Facturé à
                  </p>
                  <p className="text-[11px] font-semibold text-ink-900">
                    Dupont SARL
                  </p>
                  <p className="text-[9px] text-ink-500 leading-snug">
                    42 rue de Rivoli
                    <br />
                    75001 Paris
                  </p>
                </div>
              </div>

              {/* Tableau des lignes — Qté / PU / Total */}
              <div className="mt-3">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-[8px] uppercase tracking-wider text-ink-400 pb-1.5 border-b border-ink-900/10">
                  <span>Désignation</span>
                  <span className="text-right w-8">Qté</span>
                  <span className="text-right w-14">PU HT</span>
                  <span className="text-right w-14">Total HT</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-2 items-baseline">
                  <span className="text-[11px] text-ink-800">
                    Audit conformité
                  </span>
                  <span className="text-[10px] text-ink-700 text-right w-8 tabular-nums">
                    1
                  </span>
                  <span className="text-[10px] text-ink-700 text-right w-14 tabular-nums">
                    850,00 €
                  </span>
                  <span className="text-[11px] text-ink-900 text-right w-14 tabular-nums font-medium">
                    850,00 €
                  </span>
                </div>
              </div>

              {/* Bloc totaux — aligné à droite */}
              <div className="mt-3 pt-2 border-t border-ink-900/10 ml-auto w-[60%] space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-ink-600">Total HT</span>
                  <span className="text-[11px] text-ink-900 tabular-nums">
                    850,00 €
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-ink-600">TVA</span>
                  <span className="text-[9px] text-ink-400 italic">
                    non applicable
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1.5 border-t border-ink-900/15">
                  <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">
                    Total TTC
                  </span>
                  <span className="text-[14px] font-bold text-ink-900 tabular-nums">
                    850,00 €
                  </span>
                </div>
              </div>

              {/* Pied de facture : règlement + mention légale */}
              <div className="mt-3 pt-2 border-t border-ink-900/10">
                <p className="text-[8px] text-ink-500">
                  <span className="font-semibold text-ink-700">Règlement</span>
                  {" · "}Virement sur IBAN
                  <span className="font-mono ml-1 text-[8px]">
                    FR76 1234 5678 9012 3456 7890 123
                  </span>
                </p>
                <p className="text-[8px] italic text-ink-400 mt-1.5">
                  TVA non applicable, art. 293 B du CGI. En cas de retard de
                  paiement, application d&apos;une pénalité de 3 fois le taux
                  d&apos;intérêt légal.
                </p>
              </div>
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
              <div className="mx-auto h-20 w-20 rounded-full bg-success-500/15 grid place-items-center">
                <svg
                  width="40"
                  height="40"
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
              <p className="mt-6 text-display font-bold text-ink-900">
                Facture envoyée
              </p>
              <p className="mt-2 text-body text-ink-500">à Dupont SARL</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success-500/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-success-500 inline-block" />
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
              /* ═══ ÉTATS (cycle de 12s) ═══════════════════════════
                 Pourcentages clés :
                  0-33%   (0-4.0s)    État 1 visible (form + typing)
                  33-37%  (4.0-4.4s)  Transition 1→2
                  37-62%  (4.4-7.4s)  État 2 visible (PDF preview)
                  62-66%  (7.4-7.9s)  Transition 2→3
                  66-93%  (7.9-11.2s) État 3 visible (succès)
                  93-100% (11.2-12s)  Transition 3→1 */
              @keyframes hero-s1 {
                0%, 31%      { opacity: 1; }
                37%, 93%     { opacity: 0; }
                99%, 100%    { opacity: 1; }
              }
              @keyframes hero-s2 {
                0%, 31%      { opacity: 0; }
                37%, 60%     { opacity: 1; }
                66%, 100%    { opacity: 0; }
              }
              @keyframes hero-s3 {
                0%, 60%      { opacity: 0; }
                66%, 93%     { opacity: 1; }
                99%, 100%    { opacity: 0; }
              }
              .hero-s1 { animation: hero-s1 12s ease-in-out infinite both; }
              .hero-s2 { animation: hero-s2 12s ease-in-out infinite both; }
              .hero-s3 { animation: hero-s3 12s ease-in-out infinite both; }

              /* ═══ TYPING (clip-path) ════════════════════════════
                 Chaque champ a son propre keyframe avec son timing.
                 La valeur est révélée de gauche à droite via clip-path,
                 ce qui donne l'illusion d'une frappe. La fenêtre de
                 typing est suivie d'une période "stable" où la valeur
                 reste visible. À la fin du cycle elle redisparaît (le
                 prochain tour repart de zéro). */

              /* Client : tape 0.5s → 1.3s soit 4.2% → 10.8% du cycle */
              @keyframes hero-type-client {
                0%, 4%      { clip-path: inset(0 100% 0 0); }
                11%         { clip-path: inset(0 0% 0 0); }
                93%         { clip-path: inset(0 0% 0 0); }
                99%, 100%   { clip-path: inset(0 100% 0 0); }
              }
              /* Désignation : tape 1.7s → 2.8s soit 14.2% → 23.3% */
              @keyframes hero-type-design {
                0%, 14%     { clip-path: inset(0 100% 0 0); }
                23%         { clip-path: inset(0 0% 0 0); }
                93%         { clip-path: inset(0 0% 0 0); }
                99%, 100%   { clip-path: inset(0 100% 0 0); }
              }
              /* Montant : tape 3.1s → 3.5s soit 25.8% → 29.2% */
              @keyframes hero-type-mont {
                0%, 25%     { clip-path: inset(0 100% 0 0); }
                29%         { clip-path: inset(0 0% 0 0); }
                93%         { clip-path: inset(0 0% 0 0); }
                99%, 100%   { clip-path: inset(0 100% 0 0); }
              }

              /* ═══ CARETS (visibilité fenêtrée + clignotement) ══════
                 Combinaison de 2 animations sur des propriétés
                 différentes : 'visibility' pour la fenêtre (caret ON
                 uniquement pendant la frappe du champ correspondant)
                 et 'opacity' pour le blink rapide. */
              @keyframes hero-blink {
                0%, 49%  { opacity: 1; }
                50%, 100%{ opacity: 0; }
              }
              @keyframes hero-caret-client {
                0%, 3%    { visibility: hidden; }
                4%, 11%   { visibility: visible; }
                12%, 100% { visibility: hidden; }
              }
              @keyframes hero-caret-design {
                0%, 13%   { visibility: hidden; }
                14%, 23%  { visibility: visible; }
                24%, 100% { visibility: hidden; }
              }
              @keyframes hero-caret-mont {
                0%, 24%   { visibility: hidden; }
                25%, 29%  { visibility: visible; }
                30%, 100% { visibility: hidden; }
              }
              .hero-caret-client {
                animation: hero-blink 0.55s linear infinite,
                           hero-caret-client 12s linear infinite both;
              }
              .hero-caret-design {
                animation: hero-blink 0.55s linear infinite,
                           hero-caret-design 12s linear infinite both;
              }
              .hero-caret-mont {
                animation: hero-blink 0.55s linear infinite,
                           hero-caret-mont 12s linear infinite both;
              }

              /* ═══ AUTRES ÉLÉMENTS DU FORM ════════════════════════ */
              /* Tick vert d'autocomplete sur Client (apparaît juste
                 après que le typing soit fini) */
              @keyframes hero-tick {
                0%, 11%   { opacity: 0; transform: scale(0.5); }
                14%       { opacity: 1; transform: scale(1); }
                94%       { opacity: 1; transform: scale(1); }
                98%, 100% { opacity: 0; transform: scale(0.9); }
              }
              .hero-tick { animation: hero-tick 12s ease-out infinite both; }

              /* ═══ BOUTONS (pulse au clic) ════════════════════════
                 Bouton 1 "Créer" : clique à 4.1s = 34.2% du cycle
                 Bouton 2 "Envoyer" : clique à 7.2s = 60% */
              @keyframes hero-btn-1 {
                0%, 32%   { transform: scale(1); box-shadow: var(--shadow-pop); }
                34%       { transform: scale(0.96); box-shadow: 0 4px 12px rgba(47,107,255,0.4); }
                36%, 100% { transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              @keyframes hero-btn-2 {
                0%, 58%   { transform: scale(1); box-shadow: var(--shadow-pop); }
                60%       { transform: scale(0.96); box-shadow: 0 4px 12px rgba(47,107,255,0.4); }
                62%, 100% { transform: scale(1); box-shadow: var(--shadow-pop); }
              }
              .hero-btn-1 { animation: hero-btn-1 12s ease-out infinite both; }
              .hero-btn-2 { animation: hero-btn-2 12s ease-out infinite both; }

              /* ═══ CURSEURS SOURIS ════════════════════════════════
                 Curseur 1 (état 1) : apparait 3.5s, descend vers
                  bouton, click à 4.1s, disparaît avec l'état.
                 Curseur 2 (état 2) : apparait 6.5s, click à 7.2s. */
              @keyframes hero-cursor-1 {
                0%, 28%      { opacity: 0; transform: translate(80px, -45px) scale(1); }
                30%          { opacity: 1; transform: translate(60px, -32px) scale(1); }
                33%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                34%          { opacity: 1; transform: translate(0px, 0px) scale(0.85); }
                36%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                38%, 100%    { opacity: 0; transform: translate(0px, 0px) scale(1); }
              }
              @keyframes hero-cursor-2 {
                0%, 54%      { opacity: 0; transform: translate(80px, -45px) scale(1); }
                56%          { opacity: 1; transform: translate(60px, -32px) scale(1); }
                59%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                60%          { opacity: 1; transform: translate(0px, 0px) scale(0.85); }
                62%          { opacity: 1; transform: translate(0px, 0px) scale(1); }
                64%, 100%    { opacity: 0; transform: translate(0px, 0px) scale(1); }
              }
              .hero-cursor-1 { animation: hero-cursor-1 12s cubic-bezier(.4,0,.2,1) infinite both; }
              .hero-cursor-2 { animation: hero-cursor-2 12s cubic-bezier(.4,0,.2,1) infinite both; }

              /* Checkmark de succès — se dessine à 67% du cycle */
              @keyframes hero-check {
                0%, 65%   { stroke-dasharray: 30; stroke-dashoffset: 30; }
                72%       { stroke-dasharray: 30; stroke-dashoffset: 0; }
                100%      { stroke-dasharray: 30; stroke-dashoffset: 0; }
              }
              .hero-check { animation: hero-check 12s ease-out infinite both; }

              @media (prefers-reduced-motion: reduce) {
                .hero-s1, .hero-s2, .hero-s3,
                .hero-tick, .hero-btn-1, .hero-btn-2,
                .hero-cursor-1, .hero-cursor-2, .hero-check,
                .hero-caret-client, .hero-caret-design, .hero-caret-mont {
                  animation: none !important;
                }
                /* État statique = state 3 (succès), le plus parlant */
                .hero-s1, .hero-s2 { opacity: 0; }
                .hero-s3 { opacity: 1; }
                .hero-check { stroke-dashoffset: 0; }
                /* Typing désactivé : valeurs visibles directement */
                [class*="hero-type-"] { clip-path: none !important; }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Champ avec effet de typing : la valeur se révèle de gauche à droite
 * via clip-path inset() au moment du `typingStart` (en secondes dans
 * le cycle global de 12s). Le caret clignote pendant la fenêtre.
 *
 * Les keyframes sont définies dans le <style> du parent ; ici on
 * choisit juste la bonne classe (hero-type-client / design / mont)
 * via le label. Pas le plus DRY mais le plus prévisible.
 */
function TypingField({
  label,
  value,
  typingStart, // pas utilisé directement (keyframes inline)
  typingEnd, // idem
  withCheck = false,
  mono = false,
}: {
  label: string;
  value: string;
  typingStart: number;
  typingEnd: number;
  withCheck?: boolean;
  mono?: boolean;
}) {
  // Détermine la classe d'animation à partir du label — chaque label
  // a son propre keyframe avec son timing baked-in.
  const typeClass =
    label === "Client"
      ? "hero-type-client"
      : label === "Désignation"
      ? "hero-type-design"
      : "hero-type-mont";

  const caretClass =
    label === "Client"
      ? "hero-caret-client"
      : label === "Désignation"
      ? "hero-caret-design"
      : "hero-caret-mont";

  // Animation-name déclarée via inline style pour pouvoir réutiliser
  // le composant. On laisse les variables typingStart/typingEnd en
  // props "documentaires" même si elles ne servent qu'à coder les
  // keyframes côté parent — voir commentaire JSDoc.
  void typingStart;
  void typingEnd;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-1.5">
        {label}
      </p>
      <div className="relative h-11 rounded-[12px] bg-surface-2 px-3.5 flex items-center overflow-hidden">
        {/* La valeur "tapée" : clip-path révèle la chaîne de gauche à
            droite. On utilise inline-block pour que clip-path s'applique
            sur le contenu effectif. */}
        <span
          className={
            "inline-block " +
            typeClass +
            " text-small text-ink-900 " +
            (mono ? "tabular-nums font-medium" : "")
          }
          style={{
            // clip-path initial : on cache tout. L'animation prend le
            // relais quand elle démarre.
            clipPath: "inset(0 100% 0 0)",
          }}
        >
          {value}
        </span>
        {/* Caret juste après la valeur — apparaît pendant la fenêtre
            de typing puis disparaît. Combiné avec un blink rapide. */}
        <span
          aria-hidden
          className={
            "ml-0.5 inline-block h-4 w-[2px] bg-brand-500 align-middle " +
            caretClass
          }
          style={{ visibility: "hidden" }}
        />
        {withCheck ? (
          <span
            aria-hidden
            className="hero-tick ml-auto inline-flex items-center justify-center h-5 w-5 rounded-full bg-success-500/15 text-success-600 text-[10px] font-bold"
          >
            ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Curseur souris SVG positionné absolu. Deux variantes pour les deux
 * boutons cliqués. Animé en CSS (cf. keyframes hero-cursor-1/2).
 */
function Cursor({ variant }: { variant: "one" | "two" }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute -top-1 right-[24%] " +
        (variant === "one" ? "hero-cursor-1" : "hero-cursor-2")
      }
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        style={{ filter: "drop-shadow(0 2px 4px rgba(11,13,18,0.3))" }}
      >
        {/* Curseur "flèche" macOS — fill blanc, stroke noir */}
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
