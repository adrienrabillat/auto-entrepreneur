import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * OAuth callback.
 * Supabase redirects here after Google sign-in with a ?code= param.
 * We exchange it for a session, then persist the user's Gmail refresh token
 * so we can send emails on their behalf later.
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
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error?.message ?? "auth_failed")}`);
  }

  // provider_refresh_token is only returned on the very first Google OAuth
  // consent. If the user already signed up we won't receive it again unless
  // they pass prompt=consent (we do). Persist it into profiles.
  const session = data.session;
  const providerRefreshToken = (session as { provider_refresh_token?: string }).provider_refresh_token;
  const providerEmail = data.user?.email ?? null;

  if (providerRefreshToken) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        gmail_refresh_token: providerRefreshToken,
        gmail_connected_email: providerEmail,
      })
      .eq("id", data.user!.id);
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
