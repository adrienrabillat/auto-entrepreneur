import type { SupabaseClient } from "@supabase/supabase-js";
import { guessActivityType, submitDeclaration } from "@/lib/urssaf";

/**
 * Returns the period (year, month) that should be declared when the cron fires
 * on `today`. The auto-entrepreneur declares the *previous* calendar month.
 */
export function periodForDate(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-11 — getMonth() already returns previous when we add 0
  // today is in month m+1 (1-12). We declare month m (0-based) which is m+0 in 1-12… no:
  // today.getMonth() is 0-based. Previous month in 1-12 is m (since m = today.getMonth() is
  // already 0-based, and previous month 1-based = m).
  // Example: today is April (month=3). Previous = March = 3 in 1-12. So periodMonth = 3. ✓
  if (m === 0) return { periodYear: y - 1, periodMonth: 12 };
  return { periodYear: y, periodMonth: m };
}

export function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export type ProcessResult = {
  userId: string;
  periodYear: number;
  periodMonth: number;
  totalCents: number;
  status: string;
  reference?: string;
  error?: string;
  skipped?: boolean;
};

/**
 * Computes the revenue for (user, period) and submits it to URSSAF.
 * Idempotent: if a declaration already exists for the period, it's returned as-is.
 */
export async function processUserDeclaration(
  admin: SupabaseClient,
  user: { id: string; siret: string | null; metier: string | null },
  periodYear: number,
  periodMonth: number
): Promise<ProcessResult> {
  // Already processed?
  const { data: existing } = await admin
    .from("monthly_declarations")
    .select("*")
    .eq("user_id", user.id)
    .eq("period_year", periodYear)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (existing && existing.status !== "error") {
    return {
      userId: user.id,
      periodYear,
      periodMonth,
      totalCents: existing.total_cents,
      status: existing.status,
      reference: existing.urssaf_reference ?? undefined,
      skipped: true,
    };
  }

  // Compute revenue: sum of invoices paid during the period.
  const { startIso, endIso } = monthBounds(periodYear, periodMonth);
  const { data: invoices = [] } = await admin
    .from("invoices")
    .select("amount_cents, paid_at")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_at", startIso)
    .lt("paid_at", endIso);

  const total = (invoices ?? []).reduce((s, i) => s + (i.amount_cents as number), 0);

  // Profile guard: SIRET required to submit
  if (!user.siret) {
    const record = await upsertDeclaration(admin, user.id, periodYear, periodMonth, {
      total_cents: total,
      status: "error",
      error_message: "SIRET manquant dans le profil",
    });
    return {
      userId: user.id,
      periodYear,
      periodMonth,
      totalCents: total,
      status: "error",
      error: record.error_message ?? undefined,
    };
  }

  // Zero-revenue months still need a declaration (0 €).
  const result = await submitDeclaration({
    siret: user.siret,
    periodYear,
    periodMonth,
    revenueCents: total,
    activityType: guessActivityType(user.metier ?? ""),
  });

  if (!result.ok) {
    await upsertDeclaration(admin, user.id, periodYear, periodMonth, {
      total_cents: total,
      status: "error",
      error_message: result.error,
    });
    return {
      userId: user.id,
      periodYear,
      periodMonth,
      totalCents: total,
      status: "error",
      error: result.error,
    };
  }

  await upsertDeclaration(admin, user.id, periodYear, periodMonth, {
    total_cents: total,
    status: "submitted",
    urssaf_reference: result.reference,
    submitted_at: new Date().toISOString(),
  });

  return {
    userId: user.id,
    periodYear,
    periodMonth,
    totalCents: total,
    status: "submitted",
    reference: result.reference,
  };
}

async function upsertDeclaration(
  admin: SupabaseClient,
  userId: string,
  y: number,
  m: number,
  values: Record<string, unknown>
) {
  const { data, error } = await admin
    .from("monthly_declarations")
    .upsert(
      { user_id: userId, period_year: y, period_month: m, ...values },
      { onConflict: "user_id,period_year,period_month" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as { error_message: string | null };
}
