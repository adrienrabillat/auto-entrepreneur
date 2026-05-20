/**
 * Mockup animé du hero — workflow complet d'un auto-entrepreneur.
 *
 * Au lieu d'un simple "création de facture", on raconte la journée
 * d'un AE qui utilise Asthia, de bout en bout :
 *
 *   ┌────────────────────────────────────────────┐
 *   │ ● ● ●                  Asthia · Mai 2026    │
 *   │                                            │
 *   │ ┌────────┬─────────┬─────────┐             │
 *   │ │Encaissé│Factures │ URSSAF  │  ← dashboard│
 *   │ │ 4 280 €│ 12      │ Déclarée│             │
 *   │ │ +12 %  │ 11 payées│ 15 mai │             │
 *   │ └────────┴─────────┴─────────┘             │
 *   │                                            │
 *   │ Facture en cours #2026-042                 │
 *   │ ┌──────────────┬───────────────┐           │
 *   │ │ Client       │ ┌───────────┐ │  ← saisie │
 *   │ │ [Dupont SARL]│ │ FACTURE   │ │  + aperçu │
 *   │ │ Désignation  │ │ #2026-042 │ │  PDF live │
 *   │ │ [Audit conf.]│ │ Dupont... │ │           │
 *   │ │ Montant      │ │ 850 €     │ │           │
 *   │ │ [850 €]      │ │ TOTAL: 850│ │           │
 *   │ │ [Envoyer →]  │ │           │ │           │
 *   │ └──────────────┴───────────────┘           │
 *   │                                            │
 *   │ Activité                                   │
 *   │ ● Facture envoyée à Dupont SARL  · 1 min   │
 *   │ ● Paiement reçu · 850 €          · 5 s     │ ← auto
 *   │ ● URSSAF déclarée · 188,70 €     · instant │
 *   └────────────────────────────────────────────┘
 *
 * Cycle de 8s :
 *   t=0.0s  carte visible, mac-header + libellés statiques
 *   t=0.0s  stat 1 (Encaissé) déjà visible
 *   t=0.15s stat 2 (Factures) apparaît
 *   t=0.3s  stat 3 (URSSAF) apparaît
 *   t=0.8s  champ Client + ligne client du PDF se remplissent
 *   t=1.4s  champ Désignation + ligne d'article PDF
 *   t=2.0s  champ Montant + total PDF
 *   t=2.8s  bouton "Envoyer" pulse
 *   t=3.5s  entrée d'activité 1 : "Facture envoyée"
 *   t=4.5s  entrée d'activité 2 : "Paiement reçu"
 *   t=5.5s  entrée d'activité 3 : "URSSAF déclarée"
 *   t=7.4s  fondu général
 *   t=8.0s  reboucle
 *
 * Tout en CSS pur, server component, prefers-reduced-motion respecté.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full">
      <div
        role="img"
        aria-label="Aperçu animé d'Asthia montrant un workflow complet d'auto-entrepreneur : tableau de bord, création d'une facture avec aperçu PDF en temps réel, puis envoi automatique, paiement reçu et déclaration URSSAF qui se font tout seuls."
        className="relative surface p-6 md:p-7 overflow-hidden ring-1 ring-ink-900/[0.06] shadow-[0_24px_64px_-20px_rgba(11,13,18,0.18)]"
      >
        {/* En-tête mac-window */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
            <span className="h-2.5 w-2.5 rounded-full bg-divider" />
          </div>
          <span className="text-xs text-ink-400">Asthia · Mai 2026</span>
        </div>

        {/* ── Dashboard mini : 3 stats ──────────────────────────────── */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <StatCard
            label="Encaissé"
            value="4 280 €"
            hint="+12 % vs avril"
            tone="success"
            delay={-0.8}
          />
          <StatCard
            label="Factures"
            value="12"
            hint="11 payées"
            tone="neutral"
            delay={-0.65}
          />
          <StatCard
            label="URSSAF"
            value="Déclarée"
            hint="15 mai"
            tone="success"
            delay={-0.5}
          />
        </div>

        {/* ── Facture en cours : split form + PDF ──────────────────── */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <p className="text-small font-semibold text-ink-900">
              Facture en cours
            </p>
            <p className="text-xs text-ink-400 tabular-nums">#2026-042</p>
          </div>

          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Panneau form */}
            <div className="space-y-2.5">
              <FormField
                label="Client"
                value="Dupont SARL"
                delay={0}
                withCheck
              />
              <FormField
                label="Désignation"
                value="Audit conformité"
                delay={0.6}
              />
              <FormField
                label="Montant HT"
                value="850,00 €"
                delay={1.2}
                mono
              />
              <div className="pt-1">
                <div className="hero-btn pill pill-primary w-full justify-center text-small font-medium">
                  <span>Envoyer</span>
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

            {/* Panneau PDF preview */}
            <div className="rounded-[10px] bg-white border border-divider p-3 text-[10px] leading-snug shadow-hair">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-ink-400">
                    Facture
                  </p>
                  <p className="font-bold text-ink-900 text-[11px] tabular-nums">
                    #2026-042
                  </p>
                </div>
                <p className="text-[9px] text-ink-400 tabular-nums">
                  15/05/2026
                </p>
              </div>

              <div
                className="hero-el mt-2.5"
                style={{ animationDelay: "0.2s" }}
              >
                <p className="font-medium text-ink-900 text-[10px]">
                  Dupont SARL
                </p>
                <p className="text-[8px] text-ink-400">
                  42 rue de Rivoli · 75001 Paris
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-divider">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="hero-el text-ink-700 text-[10px] truncate"
                    style={{ animationDelay: "0.8s" }}
                  >
                    Audit conformité
                  </span>
                  <span
                    className="hero-el text-ink-900 text-[10px] tabular-nums shrink-0"
                    style={{ animationDelay: "1.4s" }}
                  >
                    850,00 €
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-divider flex items-baseline justify-between">
                <span className="font-bold text-ink-900 text-[10px] uppercase tracking-wider">
                  Total
                </span>
                <span
                  className="hero-el font-bold text-ink-900 text-[11px] tabular-nums"
                  style={{ animationDelay: "1.6s" }}
                >
                  850,00 €
                </span>
              </div>

              <p className="mt-2 text-[7.5px] italic text-ink-400 leading-tight">
                TVA non applicable, art. 293 B du CGI
              </p>
            </div>
          </div>
        </div>

        {/* ── Activité : ce qui se passe tout seul ────────────────── */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <p className="text-small font-semibold text-ink-900">Activité</p>
            <p className="text-xs text-ink-400">automatique</p>
          </div>

          <ul className="mt-3 space-y-2">
            <ActivityRow
              tone="brand"
              label="Facture #2026-042 envoyée à Dupont SARL"
              time="il y a 1 min"
              delay={2.7}
              icon="send"
            />
            <ActivityRow
              tone="success"
              label="Paiement reçu · 850 €"
              time="il y a 5 s"
              delay={3.7}
              icon="check"
            />
            <ActivityRow
              tone="success"
              label="URSSAF déclarée · 188,70 € de cotisations"
              time="à l'instant"
              delay={4.7}
              icon="shield"
            />
          </ul>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Keyframe générique : fade-in subtil + slide.
                 Cycle de 8s. animation-delay permet de staggerer chaque
                 élément. Les éléments avec delay négatif (-0.8, -0.65,
                 -0.5) sont visibles dès t=0 du cycle (stats du dashboard). */
              @keyframes hero-element-in {
                0%, 3%   { opacity: 0; transform: translateY(4px); }
                8%       { opacity: 1; transform: translateY(0); }
                90%      { opacity: 1; transform: translateY(0); }
                96%, 100%{ opacity: 0; transform: translateY(-4px); }
              }
              /* Caret clignotant pendant la "frappe" d'un champ */
              @keyframes hero-caret-blink {
                0%, 28%  { opacity: 1; }
                48%      { opacity: 0; }
                68%, 100%{ opacity: 0; }
              }
              /* Tick vert qui confirme l'autocomplete client */
              @keyframes hero-tick-in {
                0%, 10%  { opacity: 0; transform: scale(0.5); }
                16%      { opacity: 1; transform: scale(1); }
                90%      { opacity: 1; transform: scale(1); }
                96%, 100%{ opacity: 0; transform: scale(0.9); }
              }
              /* Bouton "Envoyer" : pulse à t≈3s (37% du cycle 8s) */
              @keyframes hero-btn-pulse {
                0%, 33%  { transform: scale(1); box-shadow: var(--shadow-pop); }
                38%      { transform: scale(1.04); box-shadow: 0 12px 36px rgba(47,107,255,0.32); }
                42%      { transform: scale(0.98); }
                47%, 100%{ transform: scale(1); box-shadow: var(--shadow-pop); }
              }

              .hero-el      { animation: hero-element-in 8s ease-in-out infinite both; }
              .hero-caret   { animation: hero-caret-blink 8s linear infinite both; }
              .hero-tick    { animation: hero-tick-in 8s ease-out infinite both; }
              .hero-btn     { animation: hero-btn-pulse 8s ease-in-out infinite both; }

              @media (prefers-reduced-motion: reduce) {
                .hero-el, .hero-caret, .hero-tick, .hero-btn {
                  animation: none !important;
                }
                /* État statique : tout est visible et stable */
                .hero-el { opacity: 1; transform: none; }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Card mini-stat du dashboard mockup.
 *
 * - `tone` change la couleur du value et du hint.
 * - `delay` négatif → la stat est déjà visible à t=0 du cycle global.
 */
function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "success" | "brand";
  delay: number;
}) {
  const toneClass =
    tone === "success"
      ? "text-success-600"
      : tone === "brand"
      ? "text-brand-600"
      : "text-ink-900";

  return (
    <div
      className="hero-el rounded-[10px] bg-surface-2 p-2.5"
      style={{ animationDelay: `${delay}s` }}
    >
      <p className="text-[9px] uppercase tracking-wider text-ink-400">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-small font-bold tracking-tight tabular-nums " + toneClass
        }
      >
        {value}
      </p>
      <p className="text-[10px] text-ink-500 mt-0.5">{hint}</p>
    </div>
  );
}

/**
 * Champ du formulaire fake.
 *
 * - `delay` : moment où le champ se remplit (en secondes, dans le cycle 8s)
 * - `withCheck` : tick vert d'autocomplete (utilisé sur "Client")
 * - `mono` : police tabular pour les montants
 *
 * Les CSS variables `--field-delay` décalent les keyframes enfants
 * (caret, tick) selon le delay du champ parent.
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
      <div className="relative h-9 rounded-[10px] bg-surface-2 px-3 flex items-center">
        <span
          className={
            "hero-el text-[11px] text-ink-900 " +
            (mono ? "tabular-nums font-medium" : "")
          }
          style={{ animationDelay: `${delay}s` }}
        >
          {value}
        </span>
        <span
          aria-hidden
          className="hero-caret ml-0.5 inline-block h-3.5 w-[2px] bg-brand-500 align-middle"
          style={{ animationDelay: `${delay}s` }}
        />
        {withCheck ? (
          <span
            aria-hidden
            className="hero-tick ml-auto inline-flex items-center justify-center h-4 w-4 rounded-full bg-success-500/15 text-success-600 text-[9px] font-bold"
            style={{ animationDelay: `${delay + 0.2}s` }}
          >
            ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ligne du feed d'activité.
 *
 * - `tone` : couleur du dot d'icône (success vert / brand bleu)
 * - `icon` : forme du dot (send / check / shield)
 * - `delay` : moment où la ligne apparaît dans le cycle 8s
 */
function ActivityRow({
  tone,
  label,
  time,
  delay,
  icon,
}: {
  tone: "success" | "brand";
  label: string;
  time: string;
  delay: number;
  icon: "send" | "check" | "shield";
}) {
  const dotClass =
    tone === "success"
      ? "bg-success-500/15 text-success-600"
      : "bg-brand-500/15 text-brand-600";

  return (
    <li
      className="hero-el flex items-center gap-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <span
        className={
          "inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0 " +
          dotClass
        }
        aria-hidden
      >
        {icon === "send" ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        ) : icon === "check" ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-small text-ink-800 truncate">{label}</span>
      <span className="text-xs text-ink-400 tabular-nums shrink-0">
        {time}
      </span>
    </li>
  );
}
