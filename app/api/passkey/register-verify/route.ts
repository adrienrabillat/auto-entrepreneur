import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
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

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const { deviceName, ...response } = body;

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Vérification échouée" }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

  const admin = createAdminClient();
  const { error } = await admin.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: credentialID,
    public_key: Buffer.from(credentialPublicKey).toString("base64"),
    counter,
    transports: response.response?.transports ?? null,
    device_name: typeof deviceName === "string" ? deviceName.slice(0, 60) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
