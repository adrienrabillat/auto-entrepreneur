import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeChallenge, rpID, rpName } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: existing = [] } = await admin
    .from("user_passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpID(),
    userID: Buffer.from(user.id, "utf-8"),
    userName: user.email ?? user.id,
    userDisplayName: user.user_metadata?.full_name ?? user.email ?? "Asthia",
    attestationType: "none",
    // Exclure les credentials déjà enregistrés pour cet user → le navigateur
    // ne propose pas de ré-enregistrer la même Face ID deux fois.
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      type: "public-key",
      transports: (c.transports ?? []) as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      // On veut un authenticator plateforme (Touch ID / Face ID / Windows Hello),
      // pas une clé USB — c'est le cas d'usage "verrou au lancement".
      authenticatorAttachment: "platform",
    },
  });

  storeChallenge(options.challenge);
  return NextResponse.json(options);
}
