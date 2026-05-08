import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodForDate, processUserDeclaration } from "@/lib/declaration-service";

export const dynamic = "force-dynamic";

/**
 * Lets a signed-in user run *their own* previous-month declaration on demand.
 * Uses the admin client behind the scenes because submitDeclaration may write
 * to tables the user shouldn't touch directly (none today, but keeps the door
 * open).
 */
export async function POST(_req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, siret, metier, activity_kind, onboarded")
    .eq("id", user.id)
    .single();
  if (error || !profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  if (!profile.onboarded) {
    return NextResponse.json({ error: "Complète ton profil avant de déclarer." }, { status: 400 });
  }

  const period = periodForDate(new Date());
  try {
    const result = await processUserDeclaration(
      admin,
      {
        id: profile.id,
        siret: profile.siret,
        metier: profile.metier,
        activity_kind: profile.activity_kind,
      },
      period.periodYear,
      period.periodMonth
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
