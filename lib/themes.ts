/**
 * Presets de couleur accent pour l'app.
 *
 * L'accent pilote le bleu Revolut par défaut (boutons primaires, pills
 * actifs, liens, hero glow). On peut le remplacer par d'autres couleurs
 * via data-accent sur <html>. Les CSS variables correspondantes sont
 * définies dans app/globals.css.
 *
 * Ajout d'un nouvel accent = étendre cette liste + ajouter le bloc
 * @layer base {html[data-accent="..."] {...}} dans globals.css.
 */

// Palette unifiée : 6 couleurs saturées, de même niveau de vivacité
// (équivalent du stop 500/600 Tailwind). Les previews hex correspondent
// EXACTEMENT aux --c-accent appliqués en light mode (voir globals.css).
export const ACCENTS = [
  { id: "blue",   name: "Bleu",    preview: "#2F6BFF" }, // défaut
  { id: "purple", name: "Violet",  preview: "#7C3AED" },
  { id: "green",  name: "Vert",    preview: "#10B981" },
  { id: "rose",   name: "Rose",    preview: "#EC4899" },
  { id: "orange", name: "Orange",  preview: "#F97316" },
  { id: "red",    name: "Rouge",   preview: "#EF4444" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "blue";

export function isAccentId(s: string | null | undefined): s is AccentId {
  return !!s && ACCENTS.some((a) => a.id === s);
}
