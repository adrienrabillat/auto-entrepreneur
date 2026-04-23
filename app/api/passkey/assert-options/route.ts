import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeChallenge, rpID } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: creds = [] } = await admin
    .from("user_passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: "Aucun passkey enregistré" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      type: "public-key",
      transports: (c.transports ?? []) as AuthenticatorTransport[],
    })),
  });

  storeChallenge(options.challenge);
  return NextResponse.json(options);
}
