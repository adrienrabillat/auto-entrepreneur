/**
 * Seuils annuels URSSAF micro-entrepreneur — exercice 2026.
 *
 * Source : barème URSSAF / Bofip 2026.
 *  - Vente de marchandises (BIC) : 188 700 €
 *  - Prestations de services (BIC + BNC) : 77 700 €
 *  - Activité mixte : on respecte les DEUX seuils, c'est-à-dire :
 *      * total ≤ 188 700 €
 *      * part services ≤ 77 700 €
 *
 * Au-delà de ces seuils, le micro-entrepreneur sort du régime micro et bascule
 * en BIC/BNC réel l'année suivante. C'est pour ça qu'il faut alerter avant.
 *
 * Convention : tous les montants sont exprimés en CENTIMES (cohérence avec
 * le reste de la base — pas de float).
 */

export type ActivityKind = "vente" | "service_bic" | "liberal_bnc" | "mixte";

export type ThresholdInfo = {
  /** Plafond global (même pour les services + vente en mixte). */
  globalCents: number;
  /** Plafond services seul, applicable seulement si l'activité comporte
   *  une part services. null pour activité 'vente' pure. */
  serviceCents: number | null;
  /** Libellé court affichable (ex: "Service / Libéral", "Vente"). */
  label: string;
};

export const VENTE_THRESHOLD_CENTS = 188_700_00;       // 188 700,00 €
export const SERVICE_THRESHOLD_CENTS = 77_700_00;      // 77 700,00 €

export function thresholdsFor(kind: ActivityKind): ThresholdInfo {
  switch (kind) {
    case "vente":
      return { globalCents: VENTE_THRESHOLD_CENTS, serviceCents: null, label: "Vente de marchandises" };
    case "service_bic":
      return { globalCents: SERVICE_THRESHOLD_CENTS, serviceCents: SERVICE_THRESHOLD_CENTS, label: "Prestations de services (BIC)" };
    case "liberal_bnc":
      return { globalCents: SERVICE_THRESHOLD_CENTS, serviceCents: SERVICE_THRESHOLD_CENTS, label: "Activité libérale (BNC)" };
    case "mixte":
      // En mixte : seuil global 188 700 € + sous-seuil services 77 700 €.
      return { globalCents: VENTE_THRESHOLD_CENTS, serviceCents: SERVICE_THRESHOLD_CENTS, label: "Mixte (vente + services)" };
  }
}

/**
 * Calcule l'état d'alerte par rapport à un seuil.
 *  - "ok"      : < 60 %
 *  - "watch"   : 60 % - 80 %  → bandeau jaune informatif
 *  - "warn"    : 80 % - 100 % → bandeau orange "tu approches le seuil"
 *  - "over"    : ≥ 100 %      → bandeau rouge "tu dois changer de régime"
 */
export type ThresholdStatus = "ok" | "watch" | "warn" | "over";

export function thresholdStatus(currentCents: number, capCents: number): ThresholdStatus {
  if (capCents <= 0) return "ok";
  const ratio = currentCents / capCents;
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "warn";
  if (ratio >= 0.6) return "watch";
  return "ok";
}
