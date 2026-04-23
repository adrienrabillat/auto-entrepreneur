/**
 * Extrait 1-2 initiales d'un nom (ou email) pour afficher dans un avatar.
 * - Si c'est un email : on prend la partie avant @.
 * - On split sur espaces, points, underscores, tirets.
 * - On garde les 2 premiers segments non vides.
 * - Majuscules.
 */
export function initialsFrom(s: string): string {
  const clean = (s || "").trim();
  if (!clean) return "?";
  const base = clean.includes("@") ? clean.split("@")[0] : clean;
  const parts = base
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
