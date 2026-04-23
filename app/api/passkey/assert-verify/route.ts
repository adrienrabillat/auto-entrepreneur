import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeChallenge, expectedOrigin, rpID } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const challenge = consumeChallenge();
  if (!challenge) return NextResponse.json({ error: "Challenge expiré" }, { status: 400 });

  const response = await req.json().catch(() => null);
  if (!response?.id) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data: cred } = await admin
    .from("user_passkeys")
    .select("credential_id, public_key, counter, transports")
    .eq("user_id", user.id)
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!cred) return NextResponse.json({ error: "Passkey inconnu" }, { status: 404 });

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    authenticator: {
      credentialID: cred.credential_id,
      credentialPublicKey: Buffer.from(cred.public_key as string, "base64"),
      counter: Number(cred.counter) || 0,
      transports: (cred.transports ?? []) as AuthenticatorTransport[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  await admin
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", cred.credential_id);

  return NextResponse.json({ ok: true });
}
