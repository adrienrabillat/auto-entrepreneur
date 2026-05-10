import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAsthiaAlias } from "@/lib/asthia-alias";
import { loadLogoForPdf } from "@/lib/logo-loader";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/messages/new
 *
 * Démarre une nouvelle conversation à un client. Body JSON :
 *   {
 *     clientEmail: string,
 *     clientName?: string | null,
 *     subject: string,
 *     text: string,
 *     invoiceId?: string | null,
 *     quoteId?: string | null,
 *   }
 *
 * Flow :
 *  1. Auth + check des droits.
 *  2. Find or create thread sur (user_id, client_email) — un thread
 *     par client, conformément au mental model "ma conversation avec X".
 *     invoiceId/quoteId sont stockés sur le thread comme contexte
 *     d'origine (premier doc seulement, jamais écrasé).
 *  3. Envoi via Resend depuis `<alias>@asthia.fr`.
 *  4. Insert message outbound.
 *  5. Renvoie threadId pour redirection front.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    clientEmail?: string;
    clientName?: string | null;
    subject?: string;
    text?: string;
    invoiceId?: string | null;
    quoteId?: string | null;
  };

  const clientEmail = (body.clientEmail ?? "").trim().toLowerCase();
  const subject = (body.subject ?? "").trim();
  const text = (body.text ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }
  if (!subject) return NextResponse.json({ error: "Objet manquant" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  // Profile (pour From, Reply-To, et logo banner).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, logo_path")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 500 });

  // Logo pour la bannière HTML (cid:logo).
  const logo = await loadLogoForPdf(supabase, profile.logo_path);

  // Alias Asthia personnel.
  const admin = createAdminClient();
  const alias = await ensureAsthiaAlias(admin, user.id);
  const fromAddress = `${alias}@asthia.fr`;
  const safeName = (profile.display_name ?? "Asthia").replace(/"/g, "");
  const from = `${safeName} <${fromAddress}>`;

  // Find or create thread (matching par client uniquement).
  let threadId: string;
  const { data: existingThread } = await admin
    .from("message_threads")
    .select("id")
    .eq("user_id", user.id)
    .eq("client_email", clientEmail)
    .maybeSingle();

  if (existingThread) {
    threadId = existingThread.id;
    // Bump last_message_at, on n'incrémente pas unread_count car c'est
    // l'AE qui écrit (pas un message reçu).
    await admin
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);
  } else {
    const { data: created, error: createErr } = await admin
      .from("message_threads")
      .insert({
        user_id: user.id,
        client_email: clientEmail,
        client_name: body.clientName?.trim() || null,
        subject,
        invoice_id: body.invoiceId ?? null,
        quote_id: body.quoteId ?? null,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .select("id")
      .single();
    if (createErr) {
      return NextResponse.json(
        { error: `Création thread : ${createErr.message}` },
        { status: 500 },
      );
    }
    threadId = created.id;
  }

  // HTML simple à partir du texte (conserve les sauts de ligne) +
  // bannière logo si configuré.
  const htmlLogoBanner = logo
    ? `<div style="padding-bottom:18px;margin-bottom:16px;border-bottom:1px solid #E2E8F0;">
        <img src="cid:logo" alt="${escapeHtml(profile.display_name ?? "")}" style="max-height:48px;max-width:240px;display:block;" />
      </div>`
    : "";
  const html = `<div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
    ${htmlLogoBanner}
    <div style="white-space:pre-wrap;">${escapeHtml(text)}</div>
  </div>`;

  // Envoi via Resend.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY manquante" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  // Bytes via Buffer (le SDK Resend attend `string | Buffer` pour
  // `content`). On utilise Buffer.from pour rester compatible.
  const logoAttachment = logo
    ? [
        {
          filename: `logo.${logo.mimeType === "image/png" ? "png" : "jpg"}`,
          content: Buffer.from(logo.bytes),
          contentType: logo.mimeType,
          contentId: "logo",
          contentDisposition: "inline" as const,
        },
      ]
    : undefined;
  const { data: sent, error: sendErr } = await resend.emails.send({
    from,
    to: [clientEmail],
    subject,
    text,
    html,
    replyTo: fromAddress,
    attachments: logoAttachment,
  });
  if (sendErr) {
    return NextResponse.json(
      { error: `Resend a refusé : ${sendErr.message}` },
      { status: 500 },
    );
  }

  // Insert message outbound.
  const nowIso = new Date().toISOString();
  await supabase.from("messages").insert({
    thread_id: threadId,
    user_id: user.id,
    direction: "outbound",
    from_email: fromAddress,
    from_name: profile.display_name ?? null,
    to_email: clientEmail,
    subject,
    text,
    html,
    resend_email_id: sent?.id ?? null,
    received_at: nowIso,
    delivery_status: "sent",
    last_event_at: nowIso,
  });

  return NextResponse.json({ ok: true, threadId, resendId: sent?.id ?? null });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
