/**
 * Configuration légale centralisée pour Asthia.
 *
 * Tous les éléments d'identification de l'éditeur (raison sociale, SIREN,
 * adresse, contact…) sont stockés ici plutôt qu'éparpillés dans les pages
 * légales. Quand la SAS sera officiellement créée et immatriculée, il
 * suffira de mettre à jour ce seul fichier — toutes les pages
 * /legal/mentions-legales, /legal/cgu, /legal/confidentialite vont
 * automatiquement refléter les nouvelles infos.
 *
 * IMPORTANT — TODO avant lancement public :
 *  ☐ Remplir LEGAL_NAME, SIREN, RCS_CITY, CAPITAL_EUR
 *  ☐ Adresse réelle du siège social
 *  ☐ Email de contact dédié (asthia.fr)
 *  ☐ Vérifier les infos hébergeur (selon où on déploie : Vercel, OVH, etc.)
 *  ☐ Faire relire par un avocat (CGU + RGPD = engagements forts)
 */

/**
 * Identité de l'éditeur du site.
 *
 * Asthia est en cours de création (SAS / SASU). Les valeurs ci-dessous
 * sont des PLACEHOLDERS — à remplacer par les vraies infos une fois la
 * société immatriculée. Tant qu'on est en mode "placeholder", les pages
 * légales affichent un bandeau d'avertissement (cf. components LegalNotice).
 */
export const LEGAL_NAME = "Asthia (en cours de création)";
export const LEGAL_FORM = "SAS"; // ou "SASU" selon décision
export const SIREN = "{À COMPLÉTER}";
export const RCS_CITY = "{À COMPLÉTER}";
export const CAPITAL_EUR = "{À COMPLÉTER}";

/** Adresse du siège social (ou de domiciliation pendant la phase de création). */
export const ADDRESS_LINE_1 = "{À COMPLÉTER}";
export const ADDRESS_LINE_2 = "";
export const POSTAL_CODE = "{À COMPLÉTER}";
export const CITY = "{À COMPLÉTER}";
export const COUNTRY = "France";

/** Représentant légal (président de SAS ou président de SASU). */
export const REPRESENTATIVE_NAME = "{À COMPLÉTER}";
export const REPRESENTATIVE_TITLE = "Président";

/**
 * Contact public (RGPD, support, mentions légales).
 * Pour des raisons RGPD, il faut un email dédié — pas un perso.
 */
export const CONTACT_EMAIL = "contact@asthia.fr";
export const PRIVACY_EMAIL = "privacy@asthia.fr";

/** URL canonique du site (sans slash final). */
export const SITE_URL = "https://asthia.fr";

/**
 * Hébergeur — obligatoire dans les Mentions Légales (LCEN art. 6 III).
 * Asthia est déployée sur Vercel par défaut (à confirmer).
 */
export const HOST_NAME = "Vercel Inc.";
export const HOST_ADDRESS = "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis";
export const HOST_PHONE = "+1 (650) 488-7050";

/** Base de données / sous-traitant principal — Supabase (Postgres + Auth + Storage). */
export const DB_PROVIDER_NAME = "Supabase Inc.";
export const DB_PROVIDER_URL = "https://supabase.com";

/** OAuth — Google pour la connexion + envoi Gmail au nom de l'utilisateur. */
export const OAUTH_PROVIDER_NAME = "Google LLC";
export const OAUTH_PROVIDER_URL = "https://policies.google.com/privacy";

/**
 * Date de la dernière mise à jour des CGU / mentions légales.
 * À mettre à jour manuellement à chaque modification matérielle de ces docs.
 */
export const LAST_UPDATED = "6 mai 2026";

/**
 * Helper : true si l'identité de l'éditeur est encore en mode placeholder
 * (SAS pas créée). Permet aux pages légales d'afficher un avertissement
 * "ces mentions seront finalisées à la création de la société".
 */
export function isPlaceholder(): boolean {
  return SIREN.includes("À COMPLÉTER") || ADDRESS_LINE_1.includes("À COMPLÉTER");
}
