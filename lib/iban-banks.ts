/**
 * Identification des banques françaises depuis IBAN ou BIC.
 *
 * Deux tables :
 *  - BANK_BY_CODE : code banque (5 chiffres, positions 4-8 d'un IBAN FR)
 *  - BANK_BY_BIC_PREFIX : préfixe BIC (4 premiers caractères du BIC, ex "REVO", "BNPA")
 *
 * Flow de lookup :
 *  1. On tente d'abord via IBAN (plus précis, distingue parfois plusieurs banques
 *     d'un même groupe ou régions).
 *  2. Fallback via BIC — couvre les IBAN inconnus de la table (ex : Revolut
 *     génère plusieurs codes banque selon ton pays d'enregistrement).
 *
 * Pour les logos, les initiales tiennent dans un badge 20×20 (ex "BNP",
 * "SG", "CE", "LCL"). Pas de fichier image à héberger.
 */

export type BankInfo = {
  name: string;
  /** Initiales / mini-glyph à afficher dans un badge coloré. */
  glyph: string;
  /** Source d'identification (pour debug / UI). */
  via?: "iban" | "bic";
};

// ─── Table codes IBAN FR (positions 4-8) ──────────────────────────────────
// Clé = 5 chiffres. Source : Fichier des Établissements de Crédit (2025).
const BANK_BY_CODE: Record<string, Omit<BankInfo, "via">> = {
  // Grandes banques historiques
  "30004": { name: "BNP Paribas", glyph: "BNP" },
  "30027": { name: "BNP Paribas", glyph: "BNP" },
  "30003": { name: "Société Générale", glyph: "SG" },
  "30066": { name: "CIC", glyph: "CIC" },
  "30076": { name: "Crédit du Nord", glyph: "CdN" },
  "30077": { name: "Crédit du Nord", glyph: "CdN" },
  "30056": { name: "HSBC France", glyph: "HSB" },
  "30002": { name: "LCL (Le Crédit Lyonnais)", glyph: "LCL" },
  "30087": { name: "Crédit Agricole", glyph: "CA" },
  "20041": { name: "La Banque Postale", glyph: "LBP" },
  // Crédit Agricole régionaux (échantillon)
  "11315": { name: "Crédit Agricole", glyph: "CA" },
  "12135": { name: "Crédit Agricole", glyph: "CA" },
  "19106": { name: "Crédit Agricole", glyph: "CA" },
  "19306": { name: "Crédit Agricole", glyph: "CA" },
  "19806": { name: "Crédit Agricole", glyph: "CA" },
  "17906": { name: "BforBank", glyph: "Bf" },
  "17907": { name: "BforBank", glyph: "Bf" },
  // Caisses d'Épargne (BPCE)
  "13335": { name: "Caisse d'Épargne", glyph: "CE" },
  "13507": { name: "Caisse d'Épargne Île-de-France", glyph: "CE" },
  "14445": { name: "Caisse d'Épargne", glyph: "CE" },
  "13825": { name: "Caisse d'Épargne", glyph: "CE" },
  // Banques Populaires
  "10107": { name: "BRED Banque Populaire", glyph: "BP" },
  "13338": { name: "Banque Populaire", glyph: "BP" },
  "14265": { name: "Banque Populaire Rives de Paris", glyph: "BP" },
  "10548": { name: "Banque Populaire Val de France", glyph: "BP" },
  // Crédit Mutuel / CIC
  "10207": { name: "CIC", glyph: "CIC" },
  "10057": { name: "CIC Ouest", glyph: "CIC" },
  "10096": { name: "CIC Est", glyph: "CIC" },
  "10278": { name: "Crédit Mutuel", glyph: "CM" },
  "18206": { name: "Crédit Mutuel", glyph: "CM" },
  "18306": { name: "Crédit Mutuel", glyph: "CM" },
  "15589": { name: "Crédit Mutuel", glyph: "CM" },
  // Néo-banques et services Fintech
  "16958": { name: "Boursorama Banque", glyph: "Bo" },
  "40618": { name: "Boursorama Banque", glyph: "Bo" },
  "21110": { name: "Allianz Banque", glyph: "Az" },
  "23700": { name: "Monabanq", glyph: "Mb" },
  "13168": { name: "Revolut", glyph: "R" },
  "28232": { name: "Revolut", glyph: "R" }, // Revolut via SBE Inc / Lemonway
  "14508": { name: "Revolut", glyph: "R" },
  "12548": { name: "N26", glyph: "N26" },
  "16718": { name: "N26", glyph: "N26" },
  "17418": { name: "Qonto", glyph: "Q" },
  "16798": { name: "Shine", glyph: "Sh" },
  "17098": { name: "Wise", glyph: "W" },
  "12778": { name: "Fortuneo", glyph: "Ft" },
  "30489": { name: "ING France", glyph: "IN" },
  "11989": { name: "Crédit Coopératif", glyph: "CC" },
};

// ─── Table préfixes BIC ─────────────────────────────────────────────────────
// Clé = 4 premiers caractères du BIC (institution). Source : SWIFT / banques FR.
const BANK_BY_BIC_PREFIX: Record<string, Omit<BankInfo, "via">> = {
  BNPA: { name: "BNP Paribas", glyph: "BNP" },
  SOGE: { name: "Société Générale", glyph: "SG" },
  AGRI: { name: "Crédit Agricole", glyph: "CA" },
  CRLY: { name: "LCL (Le Crédit Lyonnais)", glyph: "LCL" },
  CMCI: { name: "CIC", glyph: "CIC" },
  CCBP: { name: "Banque Populaire (BPCE)", glyph: "BP" },
  CEPA: { name: "Caisse d'Épargne (BPCE)", glyph: "CE" },
  CMBR: { name: "Crédit Mutuel", glyph: "CM" },
  CMBS: { name: "Crédit Mutuel Sud-Ouest", glyph: "CM" },
  CMMV: { name: "Crédit Mutuel", glyph: "CM" },
  PSST: { name: "La Banque Postale", glyph: "LBP" },
  BOUS: { name: "Boursorama Banque", glyph: "Bo" },
  BOUR: { name: "Boursorama Banque", glyph: "Bo" },
  HELA: { name: "Hello Bank!", glyph: "Hb" },
  MONA: { name: "Monabanq", glyph: "Mb" },
  REVO: { name: "Revolut", glyph: "R" },
  NTSB: { name: "N26", glyph: "N26" },
  QNTO: { name: "Qonto", glyph: "Q" },
  SHIN: { name: "Shine", glyph: "Sh" },
  TRWI: { name: "Wise", glyph: "W" },
  FTNO: { name: "Fortuneo", glyph: "Ft" },
  INGB: { name: "ING France", glyph: "IN" },
  COOP: { name: "Crédit Coopératif", glyph: "CC" },
  HSBC: { name: "HSBC France", glyph: "HSB" },
  NORD: { name: "Crédit du Nord", glyph: "CdN" },
  ALLI: { name: "Allianz Banque", glyph: "Az" },
  BFOR: { name: "BforBank", glyph: "Bf" },
};

export function extractFrenchBankCode(iban: string): string | null {
  const clean = (iban || "").replace(/\s+/g, "").toUpperCase();
  if (!clean.startsWith("FR") || clean.length < 9) return null;
  const code = clean.slice(4, 9);
  return /^\d{5}$/.test(code) ? code : null;
}

/**
 * Formate un IBAN pour l'affichage en groupes de 4 caractères séparés
 * d'espaces — convention internationale ISO 13616 et la plus lisible.
 *
 * Exemples :
 *   "FR7628232300001443121519422" → "FR76 2823 2300 0014 4312 1519 422"
 *   "fr76 2823 2300 0014 4312"     → "FR76 2823 2300 0014 4312"
 *
 * À utiliser comme handler onChange d'un input pour reformater à la volée
 * pendant la saisie. Le caret peut sauter d'1 caractère sur un copier-
 * coller mal collé — c'est acceptable pour le bénéfice de lisibilité.
 */
export function formatIbanForDisplay(raw: string): string {
  const clean = (raw || "").replace(/\s+/g, "").toUpperCase();
  // Découpe en groupes de 4 et rejoint avec un espace.
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Formate un BIC pour la saisie. Un BIC fait 8 ou 11 caractères, sans
 * espace canonique. On normalise juste en majuscules + retire les espaces.
 * Pas de découpe artificielle (les conventions varient et la plupart des
 * banques l'écrivent en bloc).
 */
export function formatBicForDisplay(raw: string): string {
  return (raw || "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Identifie la banque depuis BIC en PRIORITÉ (c'est l'identifiant SWIFT
 * standardisé, sans ambiguïté), IBAN en fallback.
 *
 * Raison : les codes IBAN banque sont partagés entre plusieurs filiales
 * (ex: le même code peut être assigné à Boursorama et Hello Bank selon
 * l'année), alors que le BIC est strictement lié à l'établissement.
 * Quand on a les deux, le BIC gagne toujours.
 */
export function identifyBank(iban: string, bic?: string): BankInfo | null {
  // 1. Priorité au BIC (préfixe 4 chars) s'il est fourni et reconnu
  const cleanBic = (bic ?? "").replace(/\s+/g, "").toUpperCase();
  if (cleanBic.length >= 4) {
    const prefix = cleanBic.slice(0, 4);
    if (BANK_BY_BIC_PREFIX[prefix]) {
      return { ...BANK_BY_BIC_PREFIX[prefix], via: "bic" };
    }
  }
  // 2. Fallback via IBAN (utile quand le BIC n'est pas encore saisi)
  const code = extractFrenchBankCode(iban);
  if (code && BANK_BY_CODE[code]) {
    return { ...BANK_BY_CODE[code], via: "iban" };
  }
  return null;
}
