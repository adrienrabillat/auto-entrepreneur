/**
 * Design tokens Asthia — synchronisés avec tailwind.config.ts et
 * app/globals.css. Source unique de vérité côté vidéo Remotion pour
 * que les scènes restent visuellement cohérentes avec l'app.
 *
 * Les couleurs accent sont exposées en deux formes :
 *  - `rgb` : tuple [r, g, b] pour interpoler entre deux couleurs
 *    via `interpolate()` / `interpolateColors()` de Remotion
 *  - `hex` : raccourci pour usage direct en CSS
 */

export const COLORS = {
  /* ── Surfaces (light mode) ─────────────────────────────────── */
  pageBg:   "rgb(244, 245, 247)", // --c-bg #F4F5F7
  surface:  "rgb(255, 255, 255)", // --c-surface #FFFFFF
  surface2: "rgb(250, 250, 252)", // --c-surface-2 #FAFAFC
  divider:  "rgb(234, 236, 241)", // --c-divider #EAECF1

  /* ── Texte ink ─────────────────────────────────────────────── */
  ink1: "rgb(11, 13, 18)",     // --c-ink-1 — primary text
  ink2: "rgb(74, 79, 92)",     // --c-ink-2 — body
  ink3: "rgb(138, 143, 156)",  // --c-ink-3 — muted
  ink4: "rgb(194, 198, 208)",  // --c-ink-4 — placeholder

  /* ── Accents : les 5 thèmes Asthia (data-accent) ──────────── */
  accents: {
    blue:   { rgb: [47, 107, 255], hex: "#2F6BFF",  ink: [10, 42, 128] },
    purple: { rgb: [124, 58, 237], hex: "#7C3AED",  ink: [76, 29, 149] },
    green:  { rgb: [16, 185, 129], hex: "#10B981",  ink: [6, 95, 70] },
    pink:   { rgb: [236, 72, 153], hex: "#EC4899",  ink: [131, 24, 67] },
    orange: { rgb: [249, 115, 22], hex: "#F97316",  ink: [124, 45, 18] },
  } as const,

  /* ── Sémantique ────────────────────────────────────────────── */
  success: "rgb(18, 168, 104)", // --c-green
  amber:   "rgb(243, 165, 59)", // --c-amber
  red:     "rgb(225, 69, 44)",  // --c-red
};

export type AccentName = keyof typeof COLORS.accents;

/**
 * Helper d'interpolation entre deux couleurs RGB. À utiliser quand on
 * veut faire un morph de couleur frame-par-frame (le cas du theme
 * switcher dans la scène 1 de la vidéo finale).
 */
export function rgbLerp(
  from: readonly [number, number, number] | number[],
  to: readonly [number, number, number] | number[],
  t: number,
): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ── Typo ─────────────────────────────────────────────────────── */
export const FONTS = {
  /**
   * Stack Inter. La police elle-même est chargée via
   * `@remotion/google-fonts/Inter` dans les compositions qui en ont
   * besoin (cf. exemple dans Bootstrap.tsx).
   */
  sans: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  mono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
};
