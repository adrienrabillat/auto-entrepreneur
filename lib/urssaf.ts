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

/**
 * Guess the URSSAF activity category from the user's free-text "metier".
 * Users can still override this when we wire the real API.
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
