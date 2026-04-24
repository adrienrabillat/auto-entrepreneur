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

export const ACCENTS = [
  { id: "blue",   name: "Bleu",      preview: "#2F6BFF" }, // défaut
  { id: "purple", name: "Violet",    preview: "#8B5CF6" },
  { id: "teal",   name: "Émeraude",  preview: "#14B8A6" },
  { id: "rose",   name: "Rose",      preview: "#EC4899" },
  { id: "amber",  name: "Ambre",     preview: "#F59E0B" },
  { id: "slate",  name: "Graphite",  preview: "#475569" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "blue";

export function isAccentId(s: string | null | undefined): s is AccentId {
  return !!s && ACCENTS.some((a) => a.id === s);
}
