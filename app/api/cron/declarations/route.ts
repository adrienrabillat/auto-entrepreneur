import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodForDate, processUserDeclaration } from "@/lib/declaration-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called daily by Vercel cron (see vercel.json). For each user whose declaration
 * day matches "today", submits the previous month's revenue to the URSSAF
 * (mock or live, depending on URSSAF_LIVE).
 *
 * Also reachable manually (for testing) at POST /api/cron/declarations with
 * header "Authorization: Bearer $CRON_SECRET".
 */
async function run(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Optional query params for manual runs/testing:
  //   ?day=3    override today's day-of-month check
  //   ?month=3&year=2026  force a specific period
  //   ?userId=uuid        run for a single user
  const url = new URL(request.url);
  const today = new Date();
  const dayOverride = url.searchParams.get("day");
  const dayOfMonth = dayOverride ? Number(dayOverride) : today.getUTCDate();

  const forcedMonth = url.searchParams.get("month");
  const forcedYear = url.searchParams.get("year");
  const period = forcedMonth && forcedYear
    ? { periodYear: Number(forcedYear), periodMonth: Number(forcedMonth) }
    : periodForDate(today);

  const userIdFilter = url.searchParams.get("userId");

  let query = admin.from("profiles").select("id, siret, metier, urssaf_declaration_day, onboarded");
  if (userIdFilter) query = query.eq("id", userIdFilter);
  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of profiles ?? []) {
    if (!p.onboarded) continue;
    if (!userIdFilter && !forcedMonth && p.urssaf_declaration_day !== dayOfMonth) continue;
    try {
      const r = await processUserDeclaration(
        admin,
        { id: p.id, siret: p.siret, metier: p.metier },
        period.periodYear,
        period.periodMonth
      );
      results.push(r);
    } catch (e: unknown) {
      results.push({
        userId: p.id,
        periodYear: period.periodYear,
        periodMonth: period.periodMonth,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
        totalCents: 0,
      });
    }
  }

  return NextResponse.json({ processedAt: today.toISOString(), period, results });
}

export const GET = run;
export const POST = run;
