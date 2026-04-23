/**
 * WebAuthn helpers — Face ID / Touch ID / Windows Hello via passkeys.
 *
 * Architecture:
 *  - rpID (Relying Party ID) = host du site (asthia.fr / auto-entrepreneur.vercel.app).
 *  - Le challenge temporaire est stocké dans un cookie HttpOnly pendant le
 *    flow register / assert (pas besoin d'une table de session séparée).
 *  - Les credentials persistent dans public.user_passkeys (RLS : l'utilisateur
 *    lit les siens, seul le service role peut écrire).
 */

import { cookies, headers } from "next/headers";

const CHALLENGE_COOKIE = "asthia-wa-chal";
const CHALLENGE_TTL_SECONDS = 5 * 60; // 5 min

export function storeChallenge(challenge: string) {
  cookies().set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: CHALLENGE_TTL_SECONDS,
    path: "/",
  });
}

export function consumeChallenge(): string | null {
  const value = cookies().get(CHALLENGE_COOKIE)?.value ?? null;
  if (value) {
    cookies().set(CHALLENGE_COOKIE, "", { maxAge: 0, path: "/" });
  }
  return value;
}

/** Origin attendue par @simplewebauthn — https + host actuel. */
export function expectedOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * RP ID = host SEUL (sans protocole, sans port).
 * iOS impose strictement que le RP ID soit un sous-ensemble du domaine visité.
 */
export function rpID(): string {
  const h = headers();
  const raw = h.get("x-forwarded-host") || h.get("host") || "localhost";
  return raw.split(":")[0];
}

export const rpName = "Asthia";
