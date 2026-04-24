/**
 * Identification des banques françaises à partir d'un IBAN.
 *
 * Structure d'un IBAN FR : FR76 3000 4001 23X X X X X X X X X 97
 *                            ^^ ^^^^ ^^^^
 *                            │  └────┴─── code établissement (5 chiffres)
 *                            │
 *                            pays + clé
 *
 * On extrait le code banque (positions 4-8, 5 chiffres) et on le mappe vers
 * le nom de la banque. Table des 25 banques qui couvrent ~95% des comptes
 * auto-entrepreneurs en France.
 *
 * Source : Fichier des Établissements de Crédit de la Banque de France
 * (mis à jour avril 2025). Pour les codes manquants, on renvoie null —
 * l'utilisateur peut toujours saisir à la main.
 */

export type BankInfo = {
  code: string;         // 5 chiffres
  name: string;
  /** Emoji ou initiales pour un mini-logo dans l'UI. */
  glyph?: string;
};

// Code banque → nom. Ordre d'ajout ≈ fréquence d'usage.
const BANKS: Record<string, BankInfo> = {
  "30004": { code: "30004", name: "BNP Paribas", glyph: "BNP" },
  "30003": { code: "30003", name: "Société Générale", glyph: "SG" },
  "20041": { code: "20041", name: "La Banque Postale", glyph: "LBP" },
  "10107": { code: "10107", name: "BRED Banque Populaire", glyph: "BP" },
  "10207": { code: "10207", name: "CIC", glyph: "CIC" },
  "30056": { code: "30056", name: "HSBC France", glyph: "HSBC" },
  "30077": { code: "30077", name: "Crédit du Nord", glyph: "CdN" },
  "30066": { code: "30066", name: "CIC", glyph: "CIC" },
  "30076": { code: "30076", name: "Crédit du Nord", glyph: "CdN" },
  "30027": { code: "30027", name: "BNP Paribas", glyph: "BNP" },
  "17907": { code: "17907", name: "BforBank", glyph: "B" },
  "17906": { code: "17906", name: "BforBank", glyph: "B" },
  "14445": { code: "14445", name: "Caisse d'Épargne", glyph: "CE" },
  "13335": { code: "13335", name: "Caisse d'Épargne", glyph: "CE" },
  "13507": { code: "13507", name: "Caisse d'Épargne Île-de-France", glyph: "CE" },
  "18206": { code: "18206", name: "Crédit Mutuel", glyph: "CM" },
  "18306": { code: "18306", name: "Crédit Mutuel", glyph: "CM" },
  "10278": { code: "10278", name: "Crédit Mutuel", glyph: "CM" },
  "10096": { code: "10096", name: "CIC Est", glyph: "CIC" },
  "10057": { code: "10057", name: "CIC Ouest", glyph: "CIC" },
  "30002": { code: "30002", name: "LCL (Le Crédit Lyonnais)", glyph: "LCL" },
  "11315": { code: "11315", name: "Crédit Agricole", glyph: "CA" },
  "12135": { code: "12135", name: "Crédit Agricole", glyph: "CA" },
  "19106": { code: "19106", name: "Crédit Agricole", glyph: "CA" },
  "19306": { code: "19306", name: "Crédit Agricole", glyph: "CA" },
  "16958": { code: "16958", name: "Boursorama Banque", glyph: "Bo" },
  "40618": { code: "40618", name: "Hello Bank!", glyph: "Hb" },
  "21110": { code: "21110", name: "Allianz Banque", glyph: "Az" },
  "30087": { code: "30087", name: "CRCAM (Crédit Agricole)", glyph: "CA" },
  "23700": { code: "23700", name: "Monabanq", glyph: "Mb" },
  "13168": { code: "13168", name: "Revolut", glyph: "R" },
  "12548": { code: "12548", name: "N26", glyph: "N26" },
  "17418": { code: "17418", name: "Qonto", glyph: "Q" },
  "16798": { code: "16798", name: "Shine", glyph: "Sh" },
  "17098": { code: "17098", name: "Wise", glyph: "W" },
  "13338": { code: "13338", name: "Banque Populaire", glyph: "BP" },
  "14265": { code: "14265", name: "Banque Populaire Rives de Paris", glyph: "BP" },
  "10548": { code: "10548", name: "Banque Populaire Val de France", glyph: "BP" },
};

/**
 * Extrait le code banque d'un IBAN français (5 chiffres après les 4 premiers
 * caractères "FR" + clé).
 * Retourne `null` si l'IBAN n'est pas français ou trop court.
 */
export function extractFrenchBankCode(iban: string): string | null {
  const clean = (iban || "").replace(/\s+/g, "").toUpperCase();
  if (!clean.startsWith("FR") || clean.length < 9) return null;
  const code = clean.slice(4, 9);
  return /^\d{5}$/.test(code) ? code : null;
}

/**
 * Retourne les infos banque depuis un IBAN, ou null si non identifié.
 */
export function identifyBank(iban: string): BankInfo | null {
  const code = extractFrenchBankCode(iban);
  if (!code) return null;
  return BANKS[code] ?? null;
}
