import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Webhook Resend Inbound — relais "contact@asthia.fr → ma boîte perso".
 *
 * Pourquoi cette route ?
 *  Les MX de `asthia.fr` pointent vers Resend Inbound, donc OVH ne reçoit
 *  aucun mail et la redirection OVH classique ne s'applique pas. On capte
 *  chaque mail entrant via webhook puis on demande à Resend de le forwarder
 *  vers la boîte Gmail perso.
 *
 * Comment ça marche :
 *  1. Resend reçoit un mail à `*@asthia.fr` (ex: contact@asthia.fr).
 *  2. Resend POSTe un webhook `email.received` ici (signé via Svix).
 *     Le webhook ne contient QUE des metadata (from / to / subject /
 *     email_id) — pas le corps. C'est un choix produit Resend pour
 *     limiter la taille des webhooks et supporter les grosses PJ
 *     (cf. https://resend.com/docs/dashboard/receiving/introduction).
 *  3. On vérifie la signature Svix.
 *  4. On filtre sur la liste blanche de destinataires (`INBOUND_FILTER_TO`,
 *     défaut `contact@asthia.fr`).
 *  5. On appelle `resend.emails.receiving.forward(...)` qui : (a) fetch le
 *     mail complet (corps + PJ) côté Resend via leur API privée Inbound,
 *     (b) le réémet en passthrough vers `INBOUND_FORWARD_TO`. Pas de
 *     manipulation manuelle du corps, pas de risque de body vide.
 *
 * Configuration Resend :
 *  - Resend → Webhooks → Add Endpoint
 *  - URL : https://www.asthia.fr/api/inbound/contact (avec le `www`,
 *    sinon redirect 308 et Svix ne suit pas).
 *  - Events : `email.received`.
 *  - Copier le "Signing Secret" → `RESEND_WEBHOOK_SECRET` dans Vercel.
 *
 * Variables d'environnement :
 *  - RESEND_API_KEY        : clé API Resend (obligatoire — utilisée pour
 *                            le forward et déjà nécessaire pour le reste
 *                            de l'app).
 *  - RESEND_WEBHOOK_SECRET : secret Svix pour vérifier les webhooks.
 *  - INBOUND_FORWARD_TO    : email destination (défaut "adrien.rabillat@gmail.com").
 *  - INBOUND_FORWARD_FROM  : email expéditeur du forward (défaut "Asthia Contact <noreply@asthia.fr>").
 *  - INBOUND_FILTER_TO     : adresses qu'on relaie, séparées par virgule
 *                            (défaut "contact@asthia.fr"). Vide → tout relayer.
 */

/**
 * Forme du payload `email.received` côté webhook Resend (mai 2026).
 *
 * Important : la doc parlait historiquement de `data.html` / `data.text`
 * mais en réalité le webhook ne contient QUE les metadata listés ici. Le
 * corps doit être récupéré séparément via l'API (ce que fait
 * `resend.emails.receiving.forward()` en interne).
 */
type ResendInboundWebhook = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    bcc?: string[];
    cc?: string[];
    message_id?: string;
    subject?: string;
    attachments?: Array<{ id?: string; filename?: string }>;
  };
};

export async function POST(req: NextRequest) {
  // ─── 1. Vérification de la signature Svix ───────────────────────────
  // Resend signe ses webhooks via Svix. On vérifie ici pour bloquer les
  // appels non authentifiés (sans ça, n'importe qui pourrait POST sur
  // notre URL et utiliser notre relais pour spammer).
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  // Body en RAW : la signature Svix est calculée sur le body brut, donc
  // un re-stringify après JSON.parse casserait la vérif.
  const rawBody = await req.text();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[inbound/contact] RESEND_WEBHOOK_SECRET non défini en prod — refus");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 503 },
      );
    }
    console.warn("[inbound/contact] RESEND_WEBHOOK_SECRET non défini (mode dev)");
  } else {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 401 });
    }
    // Tolérance ±5 min pour bloquer les replays.
    const tsSec = parseInt(svixTimestamp, 10);
    if (!Number.isFinite(tsSec) || Math.abs(Date.now() / 1000 - tsSec) > 300) {
      return NextResponse.json({ error: "Timestamp out of range" }, { status: 401 });
    }

    // Le secret Svix peut être préfixé "whsec_" — la doc demande de
    // l'enlever avant le base64-decode.
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    let secretBuf: Buffer;
    try {
      secretBuf = Buffer.from(rawSecret, "base64");
    } catch {
      console.error("[inbound/contact] RESEND_WEBHOOK_SECRET n'est pas un base64 valide");
      return NextResponse.json({ error: "Bad secret encoding" }, { status: 500 });
    }

    const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expected = crypto
      .createHmac("sha256", secretBuf)
      .update(signedPayload)
      .digest("base64");

    // Le header peut contenir plusieurs signatures (rotation de secret).
    // On accepte si AU MOINS UNE matche, en comparaison constant-time.
    const candidates = svixSignature
      .split(" ")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("v1,"))
      .map((s) => s.slice(3));

    const ok = candidates.some((cand) => {
      const a = Buffer.from(cand);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });

    if (!ok) {
      console.warn("[inbound/contact] Signature Svix invalide");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ─── 2. Parse du payload ─────────────────────────────────────────────
  let payload: ResendInboundWebhook;
  try {
    payload = JSON.parse(rawBody) as ResendInboundWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "email.received") {
    // Pas un événement qui nous concerne — on accuse réception sans rien faire.
    return NextResponse.json({ ok: true, ignored: true, type: payload.type });
  }

  const data = payload.data ?? {};
  const emailId = data.email_id;
  const toList = Array.isArray(data.to) ? data.to.filter(Boolean) : [];

  if (!emailId) {
    console.error("[inbound/contact] webhook sans email_id, clés data:", Object.keys(data));
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  // ─── 3. Filtrage des destinataires ──────────────────────────────────
  // Par défaut on ne relaie que `contact@asthia.fr`. Pour relayer plusieurs
  // adresses, lister dans INBOUND_FILTER_TO séparées par virgule. Vide
  // pour tout relayer.
  const filterRaw = (process.env.INBOUND_FILTER_TO ?? "contact@asthia.fr").trim();
  if (filterRaw.length > 0) {
    const allowed = filterRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matched = toList.some((addr) => allowed.includes(addr.toLowerCase()));
    if (!matched) {
      // Pas une erreur — on n'a juste pas vocation à relayer cette adresse.
      return NextResponse.json({ ok: true, skipped: true, to: toList });
    }
  }

  // ─── 4. Forward via le helper Resend ────────────────────────────────
  // `resend.emails.receiving.forward()` fetch le corps + PJ côté Resend
  // et réémet le mail. Avec `passthrough: true` (par défaut), le mail est
  // transféré tel quel — corps original, PJ inline, formatage préservé.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[inbound/contact] RESEND_API_KEY manquante — impossible de forwarder");
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const forwardTo = process.env.INBOUND_FORWARD_TO || "adrien.rabillat@gmail.com";
  const forwardFrom =
    process.env.INBOUND_FORWARD_FROM || "Asthia Contact <noreply@asthia.fr>";

  const resend = new Resend(apiKey);
  const { data: forwardData, error: forwardError } = await resend.emails.receiving.forward({
    emailId,
    to: forwardTo,
    from: forwardFrom,
    // passthrough: true (défaut) → le mail est transféré "tel quel" :
    // corps original, PJ inline, formatage préservé. Si on voulait un
    // wrapper "Forwarded message" type Gmail, on passerait `passthrough:
    // false` + un `text`/`html` d'introduction. Pour un simple alias
    // perso, le passthrough est plus naturel à l'usage.
  });

  if (forwardError) {
    console.error(
      "[inbound/contact] resend.emails.receiving.forward a échoué:",
      forwardError.message,
      forwardError,
    );
    // 500 pour que Svix retente automatiquement (4xx = erreur permanente
    // non retentée).
    return NextResponse.json(
      { error: "Forward failed", detail: forwardError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    forwardedTo: forwardTo,
    forwardId: forwardData?.id ?? null,
  });
}
