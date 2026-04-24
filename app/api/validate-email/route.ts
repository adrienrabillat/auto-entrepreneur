import { NextResponse, type NextRequest } from "next/server";
import { promises as dns } from "node:dns";

export const runtime = "nodejs"; // dns.promises.resolveMx nécessite Node, pas Edge.
export const dynamic = "force-dynamic";

/**
 * GET /api/validate-email?email=<adresse>
 *
 * Vérifie qu'un email est au bon format ET que son domaine accepte les
 * emails (au moins un record MX). C'est la validation la plus forte
 * possible sans service payant :
 *
 * - "x@gmail.com"      → ok=true  (Gmail a des MX)
 * - "x@domaine-qui-nexiste-pas.zz" → ok=false, reason="mx_not_found"
 * - "format invalide"  → ok=false, reason="bad_format"
 *
 * Note : un MX présent ne prouve pas que la boîte existe, juste que le
 * domaine accepte du courrier. Pour aller plus loin il faut un service
 * tiers (Hunter, ZeroBounce), hors scope.
 */
const EMAIL_RE = /^[^@\s]+@([^@\s]+\.[^@\s]+)$/;

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();

  const match = EMAIL_RE.exec(email);
  if (!match) {
    return NextResponse.json({ ok: false, reason: "bad_format" as const });
  }
  const domain = match[1];

  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return NextResponse.json({ ok: false, reason: "mx_not_found" as const, domain });
    }
    return NextResponse.json({ ok: true as const, domain, mxCount: records.length });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    // ENOTFOUND, ENODATA, SERVFAIL : domaine sans MX ou DNS cassé.
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return NextResponse.json({ ok: false, reason: "mx_not_found" as const, domain });
    }
    // Timeout ou autre : on donne le bénéfice du doute (réseau chez nous).
    return NextResponse.json({ ok: true as const, domain, mxCount: 0, unknown: true });
  }
}
