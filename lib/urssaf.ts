/**
 * URSSAF adapter.
 *
 * The real third-party API for the "auto-entrepreneur" monthly declaration
 * will be plugged in here once the credentials arrive. Until then, the
 * adapter runs in MOCK mode: it pretends to submit and returns a fake
 * reference so the rest of the app (cron, UI, history) can be built and
 * tested end-to-end.
 *
 * When your URSSAF client_id / client_secret arrive:
 *   1. Set URSSAF_LIVE=true
 *   2. Fill URSSAF_API_BASE_URL / URSSAF_CLIENT_ID / URSSAF_CLIENT_SECRET
 *   3. Implement `submitDeclarationLive` below against the real endpoints.
 */

export type DeclarationInput = {
  siret: string;
  periodYear: number;
  periodMonth: number;   // 1-12
  revenueCents: number;  // turnover collected during the month
  /** "BIC" (manutention, ventes) or "BNC" (sophrologie / prestation libérale) */
  activityType: "BIC_SERVICE" | "BIC_VENTE" | "BNC";
};

export type DeclarationResult =
  | { ok: true; reference: string; mode: "live" | "mock" }
  | { ok: false; error: string; mode: "live" | "mock" };

export async function submitDeclaration(input: DeclarationInput): Promise<DeclarationResult> {
  if (process.env.URSSAF_LIVE === "true") {
    return submitDeclarationLive(input);
  }
  return submitDeclarationMock(input);
}

/** Catégorie d'activité telle que choisie à l'onboarding (table profiles). */
export type ActivityKind = "vente" | "service_bic" | "liberal_bnc" | "mixte";

/**
 * Mapping explicite entre la catégorie choisie à l'onboarding et la
 * taxonomie attendue par l'API URSSAF TDAE.
 *
 * Cas "mixte" : l'AE déclare à la fois du CA vente ET du CA service.
 * Pour le moment on retombe sur BIC_SERVICE (le plus fréquent), MAIS
 * idéalement la déclaration doit être splittée en deux lignes (BIC_VENTE
 * + BIC_SERVICE) en agrégeant le CA par operation_type des factures.
 * À implémenter avant le passage en URSSAF_LIVE — voir audit du 8/05/2026.
 */
export function activityKindToType(
  kind: ActivityKind | string | null | undefined,
): DeclarationInput["activityType"] {
  switch (kind) {
    case "vente":
      return "BIC_VENTE";
    case "service_bic":
      return "BIC_SERVICE";
    case "liberal_bnc":
      return "BNC";
    case "mixte":
      // TODO: splitter par operation_type des factures
      return "BIC_SERVICE";
    default:
      // Profil incomplet (activity_kind null) — fallback prudent sur BNC
      // pour les libéraux pures, sinon BIC_SERVICE qui couvre la majorité.
      return "BIC_SERVICE";
  }
}

/**
 * @deprecated Heuristique fragile basée sur le texte libre `metier`.
 *   Préférer `activityKindToType(profile.activity_kind)`. Conservée pour
 *   la rétro-compatibilité tant que d'anciens profils n'ont pas de
 *   `activity_kind` renseigné.
 */
export function guessActivityType(metier: string): DeclarationInput["activityType"] {
  const m = (metier ?? "").toLowerCase();
  if (m.includes("sophro") || m.includes("coach") || m.includes("conseil") || m.includes("thérap")) {
    return "BNC";
  }
  if (m.includes("vente") || m.includes("commerce")) return "BIC_VENTE";
  return "BIC_SERVICE";
}

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
async function submitDeclarationMock(input: DeclarationInput): Promise<DeclarationResult> {
  // Deterministic-ish fake reference so two runs for the same month match
  const ref = `MOCK-${input.siret.slice(-4)}-${input.periodYear}${String(input.periodMonth).padStart(2, "0")}`;
  return { ok: true, reference: ref, mode: "mock" };
}

// ---------------------------------------------------------------------------
// Live implementation — fill in when URSSAF credentials arrive
// ---------------------------------------------------------------------------
async function submitDeclarationLive(_input: DeclarationInput): Promise<DeclarationResult> {
  // TODO: once the URSSAF tiers-déclarant API is available:
  //   1. POST /oauth/token  with client_credentials to get an access_token.
  //   2. POST /declarations/auto-entrepreneur with the revenue + activity.
  //   3. Return the reference in the response.
  return {
    ok: false,
    error: "URSSAF live adapter not yet implemented — set URSSAF_LIVE=false to use the mock.",
    mode: "live",
  };
}
