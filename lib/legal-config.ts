/**
 * Configuration légale centralisée pour Asthia.
 *
 * Tous les éléments d'identification de l'éditeur (raison sociale, SIREN,
 * adresse, contact…) sont stockés ici plutôt qu'éparpillés dans les pages
 * légales. Une seule source de vérité — toutes les pages
 * /legal/mentions-legales, /legal/cgu, /legal/cgv, /legal/confidentialite
 * reflètent automatiquement ces infos.
 *
 * Statut actuel : Asthia est éditée par RABILLAT ADRIEN, entrepreneur
 * individuel (micro-entrepreneur), inscrit au RNE le 03/02/2023.
 * Si une société (SAS / SASU) est créée plus tard pour porter le service,
 * il suffira de mettre à jour ce fichier (et de réactiver les champs
 * RCS_CITY / CAPITAL_EUR qui ne s'appliquent pas à un EI).
 */

/**
 * Identité de l'éditeur du site (LCEN art. 6 III).
 *
 * Pour un Entrepreneur Individuel, la "dénomination" légale est le nom
 * patronymique de l'exploitant (ici Adrien Rabillat). On peut y adjoindre
 * un nom commercial (Asthia) — c'est le SIREN qui fait foi.
 */
export const LEGAL_NAME = "Adrien Rabillat";
export const TRADE_NAME = "Asthia";
export const LEGAL_FORM = "Entrepreneur individuel (micro-entrepreneur)";
export const SIREN = "923 070 197";
export const SIRET = "923 070 197 00010";
export const VAT_NUMBER = "FR89923070197";
export const APE_CODE = "96.09Z";
export const APE_LABEL = "Autres services personnels n.c.a.";
export const RNE_REG_DATE = "03/02/2023";

/**
 * Champs propres aux sociétés (SAS, SARL…) — vides pour un EI.
 * La page Mentions légales conditionne l'affichage : si la chaîne est vide,
 * la ligne n'apparaît pas.
 */
export const RCS_CITY = "";
export const CAPITAL_EUR = "";

/** Adresse du siège social (établissement principal). */
export const ADDRESS_LINE_1 = "17 rue Victor Méric";
export const ADDRESS_LINE_2 = "";
export const POSTAL_CODE = "92110";
export const CITY = "Clichy";
export const COUNTRY = "France";

/**
 * Représentant légal — pour un EI c'est l'exploitant lui-même
 * (directeur de la publication au sens LCEN).
 */
export const REPRESENTATIVE_NAME = "Adrien Rabillat";
export const REPRESENTATIVE_TITLE = "Entrepreneur individuel";

/**
 * Contact public (RGPD, support, mentions légales).
 *
 * `contact@asthia.fr` est l'adresse officielle affichée partout sur le
 * site (mentions légales, CGU, CGV, footer). Elle doit aboutir quelque
 * part — le forwarding vers la boîte personnelle d'Adrien est assuré
 * par l'une des méthodes suivantes (à brancher OBLIGATOIREMENT avant
 * de remettre cette adresse en prod) :
 *
 *   1. Boîte OVH gratuite `contact@asthia.fr` créée dans MX Plan, avec
 *      règle de redirection vers `adrien.rabillat@gmail.com`. Solution
 *      la plus simple, conserve les MX OVH par défaut.
 *   2. Resend Inbound : webhook Next.js qui reçoit les mails entrants
 *      sur asthia.fr et les ré-émet via Resend Outbound vers Gmail.
 *      Demande de toucher aux MX du domaine — voir avertissement
 *      Resend "Routing emails to Resend will disable old MX records".
 *   3. Cloudflare Email Routing — gratuit, simple, mais demande de
 *      migrer la zone DNS d'OVH vers Cloudflare.
 *
 * ⚠️ Si aucune des 3 méthodes n'est active, les emails envoyés à
 * `contact@asthia.fr` seront PERDUS — y compris ceux de l'URSSAF.
 */
export const CONTACT_EMAIL = "contact@asthia.fr";
export const PRIVACY_EMAIL = "contact@asthia.fr";

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
export const LAST_UPDATED = "8 mai 2026";

/**
 * Helper : true si l'identité de l'éditeur n'est pas encore renseignée.
 * Conservé pour rétro-compatibilité avec d'éventuels composants
 * `LegalNotice` qui afficheraient un bandeau d'avertissement.
 */
export function isPlaceholder(): boolean {
  return SIREN.includes("À COMPLÉTER") || ADDRESS_LINE_1.includes("À COMPLÉTER");
}
