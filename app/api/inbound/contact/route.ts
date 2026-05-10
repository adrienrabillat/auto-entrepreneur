import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { resolveAliasOwner } from "@/lib/asthia-alias";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFromHeader, storeInboundMessage } from "@/lib/messaging";

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

/**
 * Construit le HTML + texte d'introduction qu'on injecte en haut du mail
 * forwardé pour que l'AE voie clairement QUI lui a envoyé (le From de
 * l'enveloppe Resend reste "Asthia Contact <noreply@asthia.fr>", donc
 * sans cet encart le vrai expéditeur n'est pas mis en avant côté Gmail).
 *
 * Utilisé en mode `passthrough: false` : Resend ajoute ensuite un footer
 * "Forwarded message" + le contenu original.
 */
function buildForwardIntro(args: {
  fromHeader: string;
  subject: string;
  receivedAtIso: string;
  recipientLabel: string; // ex: "contact@asthia.fr" ou "adrien.rabillat@asthia.fr"
}): { html: string; text: string } {
  const { fromName, fromEmail } = parseFromHeader(args.fromHeader);
  const senderDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const dateFr = formatFrenchDate(args.receivedAtIso);
  const safeSubject = args.subject?.trim() || "(sans objet)";

  const escapeHtmlLocal = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1F2937;line-height:1.55;">
  <div style="background:#EFF6FB;border-left:4px solid #065A82;padding:14px 18px;border-radius:6px;margin-bottom:18px;">
    <div style="font-weight:600;color:#065A82;margin-bottom:8px;font-size:13px;letter-spacing:0.02em;text-transform:uppercase;">📬 Reçu sur ${escapeHtmlLocal(args.recipientLabel)}</div>
    <div style="margin:4px 0;"><strong>De&nbsp;:</strong> ${escapeHtmlLocal(senderDisplay)}</div>
    <div style="margin:4px 0;"><strong>Sujet&nbsp;:</strong> ${escapeHtmlLocal(safeSubject)}</div>
    <div style="margin:4px 0;color:#6B7280;font-size:13px;"><strong>Reçu le&nbsp;:</strong> ${escapeHtmlLocal(dateFr)}</div>
  </div>
</div>`;

  const text = [
    `📬 Reçu sur ${args.recipientLabel}`,
    `De     : ${senderDisplay}`,
    `Sujet  : ${safeSubject}`,
    `Reçu le: ${dateFr}`,
    "─────────────────────────────────────────",
    "",
  ].join("\n");

  return { html, text };
}

/**
 * Format date ISO en français lisible : "9 mai 2026 à 14:32".
 */
function formatFrenchDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Forward un mail entrant avec le bon `Reply-To` pointant sur l'expéditeur
 * original ET les pièces jointes préservées.
 *
 * Le SDK Resend `receiving.forward()` n'accepte pas de `replyTo` custom,
 * donc on contourne :
 *  1. `receiving.get(emailId)` pour le corps html/text.
 *  2. `receiving.attachments.list({emailId})` pour la liste des PJ avec
 *     leurs `download_url` signés (valides ~1 h).
 *  3. `emails.send()` avec replyTo + html/text custom + attachments
 *     passés via `path: download_url` (Resend fetch côté serveur, pas
 *     besoin de download/base64 nous-même).
 *
 * Bénéfice : quand l'AE clique "Répondre" dans Gmail/Apple Mail, le mail
 * va directement à l'expéditeur original. Les PJ apparaissent comme
 * attachments natifs dans l'email forwardé.
 *
 * Limite : si une PJ dépasse 25 MB (limite Resend), `emails.send()`
 * va rejeter. On log l'erreur mais on ne fail pas tout.
 */
async function forwardWithReplyTo(args: {
  resend: Resend;
  emailId: string;
  forwardTo: string;
  forwardFrom: string;
  recipientLabel: string; // ex: "contact@asthia.fr"
  intro: { html: string; text: string };
  fromHeader: string; // pour extraire l'email à mettre en Reply-To
  subject: string;
  attachmentsCount: number;
}): Promise<{ id: string | null; error: Error | null }> {
  // 1. Fetch le mail complet pour avoir html/text.
  const { data: email, error: getErr } = await args.resend.emails.receiving.get(
    args.emailId,
  );
  if (getErr || !email) {
    return {
      id: null,
      error: new Error(getErr?.message || "Receiving.get failed"),
    };
  }

  // 2. Fetch les pièces jointes (signed URLs valides ~1 h). On ne fail
  //    pas le forward si la liste échoue : on continue sans PJ.
  //    Resend bloque pour des raisons de sécurité certains types
  //    exécutables (.js, .exe, .bat, etc.). On filtre AVANT l'envoi
  //    pour ne pas que tout le forward échoue à cause d'une PJ
  //    bloquée — on garde la liste des bloquées pour les signaler à
  //    l'AE dans le corps du mail.
  let attachmentsForSend: Array<{ filename: string; path: string; content_type?: string }> = [];
  let blockedAttachments: string[] = [];
  if (args.attachmentsCount > 0) {
    try {
      const { data: attData, error: attErr } =
        await args.resend.emails.receiving.attachments.list({ emailId: args.emailId });
      if (attErr) {
        console.warn("[inbound/contact] attachments.list failed:", attErr.message);
      } else if (attData?.data) {
        for (const a of attData.data) {
          const filename = a.filename || "attachment";
          if (isBlockedAttachmentType(filename)) {
            blockedAttachments.push(filename);
          } else {
            attachmentsForSend.push({
              filename,
              path: a.download_url, // Resend fetch côté serveur via cette URL
              content_type: a.content_type,
            });
          }
        }
      }
    } catch (e) {
      console.warn("[inbound/contact] attachments.list exception:", e);
    }
  }

  // 3. Extraction de l'adresse de l'expéditeur original pour le replyTo.
  const { fromEmail } = parseFromHeader(args.fromHeader);
  const replyTo = fromEmail || undefined;

  // 4. Construction du corps : intro + séparateur + corps original.
  //    Si certaines PJ ont été bloquées, on l'indique en encart jaune
  //    pour que l'AE sache de quoi il s'agit (et puisse demander au
  //    client de renvoyer le fichier dans un format différent ou
  //    via un service de partage type WeTransfer).
  const blockedNoticeHtml = blockedAttachments.length > 0
    ? `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:10px 14px;border-radius:6px;margin-bottom:18px;font-size:13px;color:#78350F;">
        <strong>⚠️ ${blockedAttachments.length} pièce${blockedAttachments.length > 1 ? "s" : ""} jointe${blockedAttachments.length > 1 ? "s" : ""} bloquée${blockedAttachments.length > 1 ? "s" : ""} par Resend</strong> (type exécutable interdit pour des raisons de sécurité) :<br/>
        ${blockedAttachments.map((f) => `• ${escapeHtmlSafe(f)}`).join("<br/>")}
        <div style="margin-top:6px;color:#92400E;font-size:12px;">Demande au client de renvoyer le fichier dans un format différent (zip, .txt) ou via WeTransfer si nécessaire.</div>
      </div>`
    : "";

  const blockedNoticeText = blockedAttachments.length > 0
    ? `\n⚠️ ${blockedAttachments.length} pièce(s) jointe(s) bloquée(s) (type exécutable interdit) :\n${blockedAttachments.map((f) => `  - ${f}`).join("\n")}\n`
    : "";

  const separatorHtml = `<hr style="border:none;border-top:1px solid #E2E8F0;margin:18px 0;" />`;
  const separatorText = "\n─────────── Message original ───────────\n\n";

  const html =
    args.intro.html +
    blockedNoticeHtml +
    separatorHtml +
    (email.html || (email.text ? `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtmlSafe(email.text)}</pre>` : "<em>(corps vide)</em>"));

  const text =
    args.intro.text +
    blockedNoticeText +
    separatorText +
    (email.text || "(corps vide)");

  // 5. Envoi via emails.send avec replyTo + attachments.
  const { data: sent, error: sendErr } = await args.resend.emails.send({
    from: args.forwardFrom,
    to: [args.forwardTo],
    replyTo,
    subject: args.subject || "(sans objet)",
    html,
    text,
    attachments: attachmentsForSend.length > 0 ? attachmentsForSend : undefined,
  });

  if (sendErr) {
    return { id: null, error: new Error(sendErr.message) };
  }
  return { id: sent?.id ?? null, error: null };
}

function escapeHtmlSafe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Liste des extensions bloquées par Resend (et la plupart des SMTP
 * sérieux) parce qu'elles sont potentiellement exécutables. Si l'AE
 * reçoit un fichier de ces types par mail, on ne peut pas le forwarder
 * via emails.send() — Resend retourne une erreur explicite.
 *
 * Source : observations + standards (RFC 6376 + listes maintenues par
 * Microsoft/Google pour leurs pièces jointes interdites).
 */
const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  "ade", "adp", "apk", "appx", "appxbundle", "bat", "cab", "chm", "cmd", "com",
  "cpl", "diagcab", "diagcfg", "diagpack", "dll", "dmg", "ex", "ex_", "exe",
  "hta", "img", "ins", "iso", "isp", "jar", "jnlp", "js", "jse", "lib",
  "lnk", "mde", "msc", "msi", "msix", "msixbundle", "msp", "mst", "nsh",
  "pif", "ps1", "ps1xml", "ps2", "ps2xml", "psc1", "psc2", "psm1", "py",
  "reg", "scr", "sct", "shb", "sys", "vb", "vbe", "vbs", "vhd", "vxd",
  "wsc", "wsf", "wsh", "xll",
]);

function isBlockedAttachmentType(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = filename.slice(dot + 1).toLowerCase();
  return BLOCKED_ATTACHMENT_EXTENSIONS.has(ext);
}

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

  // ─── 3. Routage par alias ──────────────────────────────────────────
  // On supporte deux familles d'adresses entrantes :
  //
  //  A) `contact@asthia.fr` (legacy). Tous les mails à cette adresse
  //     sont forwardés à `INBOUND_FORWARD_TO` (par défaut le mail perso
  //     d'Adrien). Comportement historique conservé pour les contacts
  //     marketing/support du domaine.
  //
  //  B) `<alias>@asthia.fr` (par utilisateur). On cherche un AE dont
  //     `profiles.asthia_alias = <alias>`. Si trouvé, on forward vers
  //     son email perso ET on stocke le message en base pour la
  //     messagerie in-app.
  //
  // Si aucun mail entrant ne match A ou B, on skip silencieusement.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[inbound/contact] RESEND_API_KEY manquante — impossible de forwarder");
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  const admin = createAdminClient();
  const forwardFrom =
    process.env.INBOUND_FORWARD_FROM || "Asthia Contact <noreply@asthia.fr>";
  const legacyContactForwardTo =
    process.env.INBOUND_FORWARD_TO || "adrien.rabillat@gmail.com";

  // On ne traite QUE les destinataires `*@asthia.fr` — un mail forward
  // depuis Resend Inbound peut listait d'autres recipients en CC/BCC qui
  // ne nous concernent pas.
  const asthiaTos = toList.filter((addr) => addr.toLowerCase().endsWith("@asthia.fr"));
  if (asthiaTos.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no asthia recipient", to: toList });
  }

  const results: Array<{ to: string; status: "forwarded" | "skipped"; forwardId?: string | null; error?: string }> = [];

  for (const addr of asthiaTos) {
    const localPart = addr.split("@")[0]?.toLowerCase() ?? "";

    // Cas A : legacy contact@asthia.fr
    if (localPart === "contact") {
      const intro = buildForwardIntro({
        fromHeader: data.from ?? "",
        subject: data.subject ?? "",
        receivedAtIso: data.created_at ?? new Date().toISOString(),
        recipientLabel: addr,
      });
      const { id: forwardId, error: forwardError } = await forwardWithReplyTo({
        resend,
        emailId,
        forwardTo: legacyContactForwardTo,
        forwardFrom,
        recipientLabel: addr,
        intro,
        fromHeader: data.from ?? "",
        subject: data.subject ?? "",
        attachmentsCount: data.attachments?.length ?? 0,
      });
      if (forwardError) {
        console.error("[inbound/contact] forward legacy contact a échoué:", forwardError);
        results.push({ to: addr, status: "skipped", error: forwardError.message });
      } else {
        results.push({ to: addr, status: "forwarded", forwardId });
      }
      continue;
    }

    // Cas B : alias utilisateur. Résolution via `profiles.asthia_alias`.
    const owner = await resolveAliasOwner(admin, localPart);
    if (!owner) {
      // Adresse @asthia.fr qui ne correspond à aucun utilisateur — ce
      // n'est pas un cas d'erreur à proprement parler (typo client,
      // ancien alias…). On skip et on log.
      console.warn(`[inbound/contact] alias inconnu: ${localPart}`);
      results.push({ to: addr, status: "skipped", error: "unknown alias" });
      continue;
    }

    // Forward Resend → email perso de l'AE. C'est le filet de sécurité
    // pour qu'il voie le message même s'il n'ouvre pas l'app.
    const intro = buildForwardIntro({
      fromHeader: data.from ?? "",
      subject: data.subject ?? "",
      receivedAtIso: data.created_at ?? new Date().toISOString(),
      recipientLabel: addr,
    });
    const { id: forwardId, error: forwardError } = await forwardWithReplyTo({
      resend,
      emailId,
      forwardTo: owner.email,
      forwardFrom,
      recipientLabel: addr,
      intro,
      fromHeader: data.from ?? "",
      subject: data.subject ?? "",
      attachmentsCount: data.attachments?.length ?? 0,
    });
    if (forwardError) {
      console.error(
        `[inbound/contact] forward alias=${localPart} a échoué:`,
        forwardError,
      );
      results.push({ to: addr, status: "skipped", error: forwardError.message });
      continue;
    }

    // Stockage en base pour la messagerie in-app. Best-effort : si ça
    // échoue, on a quand même fait le forward, le user verra le mail
    // dans son Gmail.
    try {
      await storeInboundMessage(admin, {
        ownerId: owner.id,
        ownerAlias: localPart,
        emailId,
        from: data.from ?? "",
        subject: data.subject ?? "(sans objet)",
        messageId: data.message_id ?? null,
        receivedAtIso: data.created_at ?? new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`[inbound/contact] store message failed for ${localPart}:`, e);
    }

    results.push({ to: addr, status: "forwarded", forwardId });
  }

  return NextResponse.json({ ok: true, results });
}
