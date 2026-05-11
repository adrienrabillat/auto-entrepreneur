import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAsthiaAlias } from "@/lib/asthia-alias";
import { loadLogoForPdf } from "@/lib/logo-loader";
import { buildSignatureHtml, buildSignatureText } from "@/lib/email-signature";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/messages/[id]/reply
 *
 * Envoie une réponse de l'AE dans un thread. Body JSON :
 *  { text: string }
 *
 * Flow :
 *  1. Auth + ownership check (RLS via createClient).
 *  2. Récupère le dernier message inbound du thread pour le `In-Reply-To`
 *     (préservation du threading côté client mail).
 *  3. Construit le sujet en `Re: <subject thread>` si pas déjà préfixé.
 *  4. Envoie via Resend depuis `<alias>@asthia.fr`.
 *  5. Insère le message en base (direction outbound).
 *  6. Bump `last_message_at` du thread, reset `unread_count`.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  // Thread (avec RLS, on ne le voit que si on en est propriétaire).
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, client_email, client_name, subject, user_id")
    .eq("id", params.id)
    .single();
  if (!thread) return NextResponse.json({ error: "Thread introuvable" }, { status: 404 });

  // Profile email (pour Reply-To, From, signature et logo).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, business_name, metier, email, logo_path")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 500 });

  const logo = await loadLogoForPdf(supabase, profile.logo_path);

  // Dernier message inbound — sert pour In-Reply-To / References.
  const { data: lastInbound } = await supabase
    .from("messages")
    .select("message_id")
    .eq("thread_id", thread.id)
    .eq("direction", "inbound")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Alias Asthia pour le From.
  const admin = createAdminClient();
  const alias = await ensureAsthiaAlias(admin, user.id);
  const fromAddress = `${alias}@asthia.fr`;
  const safeName = (profile.display_name ?? "Asthia").replace(/"/g, "");
  const from = `${safeName} <${fromAddress}>`;

  // Sujet : on préfixe Re: si pas déjà fait.
  const subject = thread.subject.toLowerCase().startsWith("re:")
    ? thread.subject
    : `Re: ${thread.subject}`;

  // HTML : corps texte + signature en pied (logo + nom + métier).
  const signatureHtml = buildSignatureHtml(profile, logo);
  const signatureText = buildSignatureText(profile);
  const html = `<div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
    <div style="white-space:pre-wrap;">${escapeHtml(text)}</div>
    ${signatureHtml}
  </div>`;
  const textWithSignature = `${text}${signatureText}`;

  // Envoi via Resend.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY manquante" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
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
    to: [thread.client_email],
    subject,
    text: textWithSignature,
    html,
    replyTo: fromAddress,
    attachments: logoAttachment,
    headers: lastInbound?.message_id
      ? {
          "In-Reply-To": lastInbound.message_id,
          References: lastInbound.message_id,
        }
      : undefined,
  });
  if (sendErr) {
    return NextResponse.json(
      { error: `Resend a refusé : ${sendErr.message}` },
      { status: 500 },
    );
  }

  // Insert message outbound + bump thread (on utilise admin pour bypass
  // RLS sur l'update de unread_count, c'est juste une stat).
  const nowIso = new Date().toISOString();
  await supabase.from("messages").insert({
    thread_id: thread.id,
    user_id: user.id,
    direction: "outbound",
    from_email: fromAddress,
    from_name: profile.display_name ?? null,
    to_email: thread.client_email,
    subject,
    text: textWithSignature,
    html,
    resend_email_id: sent?.id ?? null,
    in_reply_to: lastInbound?.message_id ?? null,
    received_at: nowIso,
    delivery_status: "sent",
    last_event_at: nowIso,
  });

  await admin
    .from("message_threads")
    .update({
      last_message_at: nowIso,
      unread_count: 0, // l'AE qui répond a forcément lu les messages.
    })
    .eq("id", thread.id);

  return NextResponse.json({ ok: true, resendId: sent?.id ?? null });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
