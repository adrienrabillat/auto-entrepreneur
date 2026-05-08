import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Webhook Resend Inbound — relais "contact@asthia.fr → ma boîte perso".
 *
 * Pourquoi cette route ?
 *  Les MX du domaine `asthia.fr` pointent vers Resend (`inbound-smtp.eu-west-1.amazonaws.com`),
 *  donc OVH ne reçoit aucun mail et la redirection OVH classique ne marche
 *  pas. Resend ne propose pas (encore) de simple forwarding via son UI : on
 *  doit donc capter chaque mail entrant via webhook et le ré-émettre nous-même.
 *
 * Comment ça marche :
 *  1. Resend reçoit un mail à `*@asthia.fr` (ex: `contact@asthia.fr`).
 *  2. Resend POST sur cette URL avec le contenu du mail (signé via Svix).
 *  3. On vérifie la signature pour s'assurer que l'appel vient bien de Resend
 *     (sinon n'importe qui pourrait spammer notre relais).
 *  4. On filtre sur les adresses qu'on veut effectivement relayer (par défaut
 *     `contact@asthia.fr`).
 *  5. On ré-émet via l'API Resend Outbound vers `INBOUND_FORWARD_TO`
 *     (par défaut `adrien.rabillat@gmail.com`), en mettant l'expéditeur
 *     d'origine en Reply-To pour qu'on puisse répondre directement.
 *
 * Configuration côté Resend :
 *  - Resend → Webhooks → Add Endpoint
 *  - URL : https://asthia.fr/api/inbound/contact
 *  - Events : `email.received` (ou équivalent dans l'UI Resend)
 *  - Copier le "Signing Secret" qui s'affiche → coller dans Vercel ENV
 *    sous le nom `RESEND_WEBHOOK_SECRET`
 *
 * Variables d'environnement requises (Vercel) :
 *  - RESEND_API_KEY        : clé API Resend (envoi outbound)
 *  - RESEND_WEBHOOK_SECRET : secret Svix pour vérifier les webhooks Resend
 *  - INBOUND_FORWARD_TO    : email destination (défaut "adrien.rabillat@gmail.com")
 *  - INBOUND_FORWARD_FROM  : email expéditeur du forward (défaut "Asthia Contact <noreply@asthia.fr>")
 *  - INBOUND_FILTER_TO     : adresse(s) qu'on relaie, séparées par virgule
 *                            (défaut "contact@asthia.fr"). Si vide → on relaie tout.
 */

type ResendInboundEmail = {
  type?: string;
  created_at?: string;
  data?: {
    from?: { address?: string; name?: string } | string;
    to?: Array<{ address?: string; name?: string } | string> | string;
    subject?: string;
    html?: string | null;
    text?: string | null;
    attachments?: Array<{
      filename?: string;
      content?: string; // base64 selon doc
      url?: string; // URL signée temporaire selon doc (à fetch puis ré-attacher)
      content_type?: string;
    }>;
  };
};

export async function POST(req: NextRequest) {
  // ─── 1. Vérification de la signature Svix ───────────────────────────
  // Resend signe ses webhooks via Svix. On vérifie ici pour s'assurer
  // que l'appel vient bien de Resend (sinon n'importe qui pourrait
  // POST sur cette URL et utiliser notre app comme relais de spam).
  //
  // Format Svix : la valeur du header `svix-signature` contient une ou
  // plusieurs signatures séparées par espace, chacune au format
  // "v1,<base64-hmac-sha256(secret, '{svix-id}.{svix-timestamp}.{body}')>".
  // Tolérance de timestamp : ±5 minutes pour bloquer les replays.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  // On lit le body en RAW (avant le JSON.parse) parce que la signature
  // est calculée sur le body brut — si on stringify après parse, les
  // espaces et l'ordre des clés peuvent différer et la vérif échoue.
  const rawBody = await req.text();

  if (!secret) {
    // Mode dev : on accepte sans vérification mais on log un warning.
    // À NE JAMAIS laisser tel quel en prod — si le secret n'est pas
    // configuré, on refuse l'appel pour éviter d'être un relais ouvert.
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
      return NextResponse.json(
        { error: "Missing Svix headers" },
        { status: 401 },
      );
    }
    // Bloque les replays : on rejette tout ce qui a plus de 5 min.
    const tsSec = parseInt(svixTimestamp, 10);
    if (!Number.isFinite(tsSec) || Math.abs(Date.now() / 1000 - tsSec) > 300) {
      return NextResponse.json(
        { error: "Timestamp out of range" },
        { status: 401 },
      );
    }

    // Le secret Svix peut être préfixé par "whsec_" — la doc demande
    // d'enlever ce préfixe avant le base64-decode.
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
    // On accepte si AU MOINS UNE matche notre expected, en comparaison
    // constant-time pour ne pas leaker via timing attack.
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
  let payload: ResendInboundEmail;
  try {
    payload = JSON.parse(rawBody) as ResendInboundEmail;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const data = payload.data ?? {};

  // Normalise le from / to qui peuvent être soit objets soit strings
  // selon la version de l'API Resend Inbound.
  const fromAddress = typeof data.from === "string"
    ? data.from
    : data.from?.address || "";
  const fromName = typeof data.from === "string"
    ? data.from.split("@")[0]
    : data.from?.name || fromAddress;

  const toRaw = data.to;
  const toList: string[] = Array.isArray(toRaw)
    ? toRaw
        .map((r) => (typeof r === "string" ? r : r.address || ""))
        .filter(Boolean)
    : typeof toRaw === "string"
      ? [toRaw]
      : [];

  // ─── 3. Filtrage des destinataires ──────────────────────────────────
  // Par défaut on relaie UNIQUEMENT contact@asthia.fr. Pour relayer
  // d'autres adresses, lister dans INBOUND_FILTER_TO séparées par
  // virgule (ex: "contact@asthia.fr,support@asthia.fr"). Mettre vide
  // pour tout relayer.
  const filterRaw = (process.env.INBOUND_FILTER_TO ?? "contact@asthia.fr").trim();
  if (filterRaw.length > 0) {
    const allowed = filterRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matched = toList.some((addr) => allowed.includes(addr.toLowerCase()));
    if (!matched) {
      // Pas une erreur — juste un mail entrant qu'on ne veut pas relayer
      // (par ex. si Resend nous notifiait sur d'autres adresses).
      return NextResponse.json({ ok: true, skipped: true, to: toList });
    }
  }

  // ─── 4. Construction du forward ─────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[inbound/contact] RESEND_API_KEY manquante — impossible de forwarder");
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const forwardTo = process.env.INBOUND_FORWARD_TO || "adrien.rabillat@gmail.com";
  const forwardFrom =
    process.env.INBOUND_FORWARD_FROM || "Asthia Contact <noreply@asthia.fr>";
  const originalSubject = data.subject || "(sans objet)";
  const forwardSubject = `[Asthia] ${originalSubject}`;

  // En-tête HTML qui rappelle le mail d'origine, suivi du contenu brut.
  // Le Reply-To pointe sur l'expéditeur d'origine, donc un simple
  // "Répondre" depuis Gmail répond directement à la bonne personne
  // (pas à noreply@asthia.fr).
  const safeFromName = escapeHtml(fromName);
  const safeFromAddress = escapeHtml(fromAddress);
  const safeToList = escapeHtml(toList.join(", "));
  const headerHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                font-size:13px;color:#6e7585;background:#f4f5f7;
                border-radius:12px;padding:12px 16px;margin-bottom:16px;line-height:1.5;">
      <div><strong>Reçu par Asthia</strong> — relayé automatiquement vers ta boîte perso.</div>
      <div>De : <strong style="color:#0b0d12">${safeFromName}</strong> &lt;${safeFromAddress}&gt;</div>
      <div>À : ${safeToList}</div>
    </div>
  `.trim();

  const bodyHtml = data.html
    ? data.html
    : data.text
      ? `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${escapeHtml(data.text)}</pre>`
      : "<em>(corps vide)</em>";
  const forwardHtml = headerHtml + bodyHtml;

  const headerText =
    `Reçu par Asthia — relayé automatiquement vers ta boîte perso.\n` +
    `De : ${fromName} <${fromAddress}>\n` +
    `À : ${toList.join(", ")}\n` +
    `\n────────────────────────────────────\n\n`;
  const forwardText = headerText + (data.text ?? "(corps vide)");

  // Pièces jointes : Resend Inbound peut renvoyer soit du base64 inline
  // (`content`), soit une URL signée à télécharger (`url`). On gère
  // d'abord le cas inline (le plus simple). Pour les URLs, on fetch
  // chaque PJ et on convertit en base64 — best-effort, on ne bloque pas
  // le forward si le fetch échoue (la PJ sera juste manquante).
  const attachments: Array<{ filename: string; content: string }> = [];
  for (const a of data.attachments ?? []) {
    if (!a.filename) continue;
    if (a.content) {
      attachments.push({ filename: a.filename, content: a.content });
    } else if (a.url) {
      try {
        const r = await fetch(a.url);
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          attachments.push({
            filename: a.filename,
            content: buf.toString("base64"),
          });
        }
      } catch (e) {
        console.warn("[inbound/contact] PJ non récupérable:", a.filename, e);
      }
    }
  }

  // ─── 5. Envoi du forward via Resend Outbound ───────────────────────
  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: forwardFrom,
      to: [forwardTo],
      reply_to: fromAddress || undefined,
      subject: forwardSubject,
      html: forwardHtml,
      text: forwardText,
      attachments: attachments.length > 0 ? attachments : undefined,
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    console.error(
      "[inbound/contact] Forward Resend a échoué:",
      sendRes.status,
      errText.slice(0, 500),
    );
    // On retourne 500 pour que Resend retente automatiquement (Svix
    // gère le retry exponentiel sur 5xx — 4xx sont considérés comme
    // permanents et ne sont pas retentés).
    return NextResponse.json(
      { error: "Forward failed", detail: errText.slice(0, 200) },
      { status: 500 },
    );
  }

  const sendData = (await sendRes.json()) as { id?: string };
  return NextResponse.json({
    ok: true,
    forwardedTo: forwardTo,
    forwardId: sendData.id ?? null,
  });
}

/**
 * Échappe les caractères HTML dangereux pour empêcher qu'un mail
 * malveillant injecte du HTML dans le mail forwardé (ex: <script>
 * dans le subject ou le from name).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
