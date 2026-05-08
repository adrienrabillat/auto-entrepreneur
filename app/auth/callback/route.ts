import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback.
 * Supabase redirects here après login Google (ou autre provider) avec un
 * `?code=` param. On l'échange contre une session puis on redirige vers
 * /onboarding si le profil n'est pas finalisé, sinon vers /dashboard
 * (ou la page demandée via `?next=`).
 *
 * Historique : on persistait avant le `provider_refresh_token` Google
 * pour envoyer les factures via gmail.send. Depuis la décommission
 * Gmail (mai 2026), on ne stocke plus ce token — Google sert uniquement
 * d'identité de login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error?.message ?? "auth_failed")}`,
    );
  }

  // Decide where to send the user. If they haven't onboarded, force them through.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", data.user!.id)
    .maybeSingle();

  const destination = profile?.onboarded ? next : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
