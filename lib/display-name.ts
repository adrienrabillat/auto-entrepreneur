/**
 * Nettoie un nom d'affichage : si la valeur est "[Non éligible]" (ou variante
 * casse/espaces), on la considère comme absente.
 *
 * Utilisé pour le champ `business_name` / `company_name` des profils et
 * clients : quand un auto-entrepreneur n'a pas de nom commercial, certaines
 * sources (SIRENE, URSSAF) stockent "[Non éligible]" au lieu de null.
 * Afficher ce texte brut dans l'UI est confus — on préfère fallback sur
 * Prénom + Nom.
 */
export function cleanDisplayName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  // Détection : "[Non éligible]", "[NON ELIGIBLE]", "[non éligible]", etc.
  if (/^\[non\s+[eé]ligible\]$/i.test(trimmed)) return null;
  return trimmed || null;
}

/**
 * Construit le label d'affichage pour un client dans les listes/détails.
 *
 * Logique :
 *  - Client pro avec company_name valide → "Société — Contact"
 *  - Client pro dont company_name est [Non éligible] → Prénom + Nom ou email
 *  - Particulier → Prénom + Nom ou email
 */
export function clientDisplayLabel(c: {
  is_pro: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string;
}): string {
  const company = cleanDisplayName(c.company_name);
  if (c.is_pro && company) {
    const who = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return who ? `${company} — ${who}` : company;
  }
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}

/**
 * Nettoie un client_name sur une facture ou devis : si la valeur est
 * "[Non éligible]", retourne null pour que le fallback sur email s'active.
 */
export function cleanClientName(name: string | null | undefined): string | null {
  return cleanDisplayName(name);
}
