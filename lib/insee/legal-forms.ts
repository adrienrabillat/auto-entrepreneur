/**
 * Référentiel INSEE des Catégories Juridiques (TR1).
 *
 * Source officielle : https://www.insee.fr/fr/information/2028129
 * Stable depuis 2007, mises à jour mineures uniquement.
 *
 * Les ~80 codes ci-dessous couvrent ~99% des entreprises françaises.
 * Pour les codes manquants on retombe sur "Forme juridique inconnue (XXXX)".
 *
 * Chaque entrée fournit :
 *  - label : libellé officiel INSEE pour affichage
 *  - normalized : forme normalisée pour notre enum applicatif
 *    (EI / EURL / SASU / Autre)
 */

export type NormalizedLegalForm =
  | "EI"     // Entrepreneur individuel (incl. micro-entrepreneur)
  | "EURL"   // SARL à associé unique
  | "SARL"   // SARL classique (multi-associés)
  | "SAS"    // Société par actions simplifiée
  | "SASU"   // SAS à associé unique
  | "SA"     // Société anonyme
  | "SCI"    // Société civile immobilière
  | "Autre";

type LegalFormEntry = {
  label: string;
  normalized: NormalizedLegalForm;
};

const LEGAL_FORMS: Record<string, LegalFormEntry> = {
  // ─── Personnes physiques ──────────────────────────────────────────
  "1000": { label: "Entrepreneur individuel", normalized: "EI" },

  // ─── SARL et apparentés ───────────────────────────────────────────
  "5410": { label: "SARL nationale", normalized: "SARL" },
  "5415": { label: "SARL d'économie mixte", normalized: "SARL" },
  "5422": { label: "SARL immobilière de gestion", normalized: "SARL" },
  "5426": { label: "SARL immobilière de construction", normalized: "SARL" },
  "5430": { label: "SARL d'économie sociale", normalized: "SARL" },
  "5431": { label: "SARL de presse", normalized: "SARL" },
  "5432": { label: "SARL d'aménagement foncier", normalized: "SARL" },
  "5442": { label: "SARL d'attribution", normalized: "SARL" },
  "5443": { label: "SARL coopérative ouvrière (SCOP)", normalized: "SARL" },
  "5451": { label: "SARL coopérative de consommation", normalized: "SARL" },
  "5453": { label: "SARL coopérative artisanale", normalized: "SARL" },
  "5454": { label: "SARL coopérative d'intérêt maritime", normalized: "SARL" },
  "5455": { label: "SARL coopérative de transport", normalized: "SARL" },
  "5458": { label: "SARL coopérative ouvrière de production (SCOP)", normalized: "SARL" },
  "5459": { label: "SARL union de sociétés coopératives", normalized: "SARL" },
  "5460": { label: "Autre SARL coopérative", normalized: "SARL" },
  "5470": { label: "SARL de presse", normalized: "SARL" },
  "5485": { label: "EURL — SARL unipersonnelle", normalized: "EURL" },
  "5498": { label: "SARL unipersonnelle", normalized: "EURL" },
  "5499": { label: "SARL", normalized: "SARL" },

  // ─── SA à conseil d'administration ────────────────────────────────
  "5505": { label: "SA à participation ouvrière", normalized: "SA" },
  "5510": { label: "SA nationale à conseil d'administration", normalized: "SA" },
  "5515": { label: "SA d'économie mixte à conseil d'administration", normalized: "SA" },
  "5522": { label: "SA immobilière de gestion à conseil d'administration", normalized: "SA" },
  "5532": { label: "SA d'attribution à conseil d'administration", normalized: "SA" },
  "5542": { label: "SA d'attribution à conseil d'administration", normalized: "SA" },
  "5543": { label: "SA coopérative ouvrière (SCOP) à CA", normalized: "SA" },
  "5547": { label: "SA coopérative HLM à conseil d'administration", normalized: "SA" },
  "5548": { label: "SA de crédit immobilier à conseil d'administration", normalized: "SA" },
  "5551": { label: "SA coopérative de consommation à CA", normalized: "SA" },
  "5552": { label: "SA coopérative artisanale à CA", normalized: "SA" },
  "5553": { label: "SA coopérative ouvrière de production à CA (SCOP)", normalized: "SA" },
  "5554": { label: "SA coopérative agricole à CA", normalized: "SA" },
  "5555": { label: "SA coopérative d'intérêt collectif (SCIC) à CA", normalized: "SA" },
  "5558": { label: "SA coopérative à CA", normalized: "SA" },
  "5559": { label: "SA union de coopératives à CA", normalized: "SA" },
  "5560": { label: "Autre SA coopérative à CA", normalized: "SA" },
  "5570": { label: "SA nationalisée à conseil d'administration", normalized: "SA" },
  "5585": { label: "SA à conseil d'administration", normalized: "SA" },
  "5599": { label: "SA à conseil d'administration", normalized: "SA" },

  // ─── SA à directoire ───────────────────────────────────────────────
  "5605": { label: "SA à participation ouvrière à directoire", normalized: "SA" },
  "5610": { label: "SA nationale à directoire", normalized: "SA" },
  "5615": { label: "SA d'économie mixte à directoire", normalized: "SA" },
  "5622": { label: "SA immobilière de gestion à directoire", normalized: "SA" },
  "5632": { label: "SA d'attribution à directoire", normalized: "SA" },
  "5642": { label: "SA d'attribution à directoire", normalized: "SA" },
  "5670": { label: "SA nationalisée à directoire", normalized: "SA" },
  "5685": { label: "SA à directoire", normalized: "SA" },
  "5699": { label: "SA à directoire", normalized: "SA" },

  // ─── SAS / SASU ────────────────────────────────────────────────────
  "5710": { label: "SAS — Société par actions simplifiée", normalized: "SAS" },
  "5720": { label: "SASU — SAS à associé unique", normalized: "SASU" },

  // ─── Sociétés européennes ──────────────────────────────────────────
  "5800": { label: "Société européenne", normalized: "Autre" },

  // ─── GIE et structures de coordination ────────────────────────────
  "6210": { label: "GEIE — Groupement européen d'intérêt économique", normalized: "Autre" },
  "6220": { label: "GIE — Groupement d'intérêt économique", normalized: "Autre" },

  // ─── Structures coopératives agricoles ────────────────────────────
  "6316": { label: "CUMA — Coopérative d'utilisation de matériel agricole", normalized: "Autre" },
  "6317": { label: "Société coopérative agricole", normalized: "Autre" },
  "6318": { label: "Union de sociétés coopératives agricoles", normalized: "Autre" },

  // ─── Sociétés civiles ─────────────────────────────────────────────
  "6411": { label: "Société d'assurance mutuelle", normalized: "Autre" },
  "6511": { label: "SCPI — Société civile de placement immobilier", normalized: "SCI" },
  "6521": { label: "SCI — Société civile immobilière", normalized: "SCI" },
  "6532": { label: "SCP — Société civile professionnelle", normalized: "Autre" },
  "6533": { label: "Société civile particulière", normalized: "Autre" },
  "6534": { label: "Société civile foncière", normalized: "Autre" },
  "6535": { label: "Société civile immobilière de construction-vente", normalized: "Autre" },
  "6536": { label: "Société civile d'exploitation agricole", normalized: "Autre" },
  "6539": { label: "Société civile laitière", normalized: "Autre" },
  "6540": { label: "SCM — Société civile de moyens", normalized: "Autre" },
  "6541": { label: "Société civile (autre)", normalized: "Autre" },
  "6543": { label: "GAEC — Groupement agricole d'exploitation en commun", normalized: "Autre" },
  "6544": { label: "EARL — Exploitation agricole à responsabilité limitée", normalized: "Autre" },
  "6551": { label: "Société civile coopérative de consommation", normalized: "Autre" },
  "6554": { label: "Société civile coopérative artisanale", normalized: "Autre" },
  "6558": { label: "Société civile coopérative entre médecins", normalized: "Autre" },
  "6560": { label: "Autre société civile coopérative", normalized: "Autre" },
  "6561": { label: "SICA — Société d'intérêt collectif agricole", normalized: "Autre" },
  "6562": { label: "GFA — Groupement foncier agricole", normalized: "Autre" },
  "6563": { label: "GFR — Groupement foncier rural", normalized: "Autre" },
  "6564": { label: "GFR — Groupement foncier rural", normalized: "Autre" },
  "6585": { label: "Autre société civile à objet immobilier", normalized: "Autre" },
  "6588": { label: "Société civile (autre)", normalized: "Autre" },
  "6589": { label: "Société civile (autre)", normalized: "Autre" },

  // ─── Associations & Fondations ─────────────────────────────────────
  "9210": { label: "Association non déclarée", normalized: "Autre" },
  "9220": { label: "Association déclarée", normalized: "Autre" },
  "9221": { label: "Association déclarée d'insertion", normalized: "Autre" },
  "9222": { label: "Association intermédiaire", normalized: "Autre" },
  "9223": { label: "Groupement de gestion d'un GEIE", normalized: "Autre" },
  "9230": { label: "Association déclarée d'utilité publique", normalized: "Autre" },
  "9240": { label: "Congrégation", normalized: "Autre" },
  "9260": { label: "Association de droit local (Alsace-Moselle)", normalized: "Autre" },
  "9300": { label: "Fondation", normalized: "Autre" },
  "9900": { label: "Autre personne morale de droit privé", normalized: "Autre" },
};

/**
 * Retourne le libellé officiel INSEE pour un code de catégorie juridique,
 * ou un fallback si le code est inconnu.
 */
export function legalFormLabel(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "Forme juridique non précisée";
  const entry = LEGAL_FORMS[c];
  return entry ? entry.label : `Forme juridique ${c}`;
}

/**
 * Mappe un code INSEE vers notre enum applicatif (EI/EURL/SASU/Autre).
 * Tout code inconnu tombe sur "Autre".
 */
export function normalizeLegalForm(code: string | null | undefined): NormalizedLegalForm {
  const c = (code ?? "").trim();
  return LEGAL_FORMS[c]?.normalized ?? "Autre";
}
