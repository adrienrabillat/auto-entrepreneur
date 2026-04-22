/**
 * Minimal Gmail client using just fetch.
 *
 * Why not googleapis? That package ships type definitions for every Google
 * API (several hundred MB, 1M+ lines) just to send a single email. The
 * Gmail REST API is trivial to call directly with fetch.
 *
 * Auth: OAuth 2.0 refresh-token flow. We exchange the user's refresh token
 *       (stored in profiles.gmail_refresh_token during /auth/callback) for a
 *       short-lived access token, then POST the base64url-encoded MIME to
 *       /gmail/v1/users/me/messages/send.
 */

export type GmailSendInput = {
  refreshToken: string;
  fromEmail: string;          // the user's Gmail address
  fromName: string;           // displayed name
  to: string;
  subject: string;
  html: string;
  text: string;
  bccSelf?: boolean;
  attachment?: {
    filename: string;
    contentType: string;      // e.g. "application/pdf"
    content: Uint8Array;
  };
};

export async function sendGmail(input: GmailSendInput): Promise<{ messageId: string }> {
  const accessToken = await getAccessToken(input.refreshToken);
  const raw = buildRawMime(input);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const body = await res.text();
    // 403 with ACCESS_TOKEN_SCOPE_INSUFFICIENT means the stored refresh token
    // was issued without gmail.send — the user needs to reconnect Gmail with
    // the right permission checked on the Google consent screen.
    if (res.status === 403 && body.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")) {
      throw new Error(
        "GMAIL_SCOPE_MISSING: ton compte Google n'a pas autorisé l'envoi de mails. Va dans Profil → Reconnecter Gmail et coche « Envoyer des e-mails en votre nom » sur l'écran Google."
      );
    }
    throw new Error(`Gmail send failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { messageId: data.id ?? "" };
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants dans l'environnement.");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Échec du refresh Google OAuth (${res.status}) : ${msg.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Réponse OAuth sans access_token.");
  return json.access_token;
}

/**
 * Builds an RFC 2822 MIME message with an optional PDF attachment and
 * returns it base64url-encoded (Gmail expects the whole message under "raw").
 */
function buildRawMime(input: GmailSendInput): string {
  const boundaryMixed = "aeboundary_" + Math.random().toString(36).slice(2);
  const boundaryAlt = "altboundary_" + Math.random().toString(36).slice(2);

  const fromHeader = `${encodeHeader(input.fromName)} <${input.fromEmail}>`;

  const headers = [
    `From: ${fromHeader}`,
    `To: ${input.to}`,
    ...(input.bccSelf ? [`Bcc: ${input.fromEmail}`] : []),
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
  ];

  let body = "";
  if (input.attachment) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundaryMixed}"`);

    body += `--${boundaryMixed}\r\n`;
    body += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;

    body += `--${boundaryAlt}\r\n`;
    body += `Content-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n`;
    body += `${input.text}\r\n`;

    body += `--${boundaryAlt}\r\n`;
    body += `Content-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n`;
    body += `${input.html}\r\n`;

    body += `--${boundaryAlt}--\r\n`;

    const b64 = bufferToBase64(input.attachment.content);
    const chunked = b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
    body += `--${boundaryMixed}\r\n`;
    body += `Content-Type: ${input.attachment.contentType}; name="${input.attachment.filename}"\r\n`;
    body += `Content-Disposition: attachment; filename="${input.attachment.filename}"\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${chunked}\r\n`;
    body += `--${boundaryMixed}--\r\n`;
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundaryAlt}"`);
    body += `--${boundaryAlt}\r\n`;
    body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    body += `${input.text}\r\n`;
    body += `--${boundaryAlt}\r\n`;
    body += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    body += `${input.html}\r\n`;
    body += `--${boundaryAlt}--\r\n`;
  }

  const message = headers.join("\r\n") + "\r\n\r\n" + body;
  return base64UrlEncode(message);
}

function encodeHeader(str: string) {
  if (/^[\x20-\x7E]*$/.test(str)) return str;
  return `=?UTF-8?B?${Buffer.from(str, "utf8").toString("base64")}?=`;
}

function base64UrlEncode(str: string) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function bufferToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}
