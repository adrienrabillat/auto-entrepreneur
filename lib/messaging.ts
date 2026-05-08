import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/**
 * Helpers messagerie in-app.
 *
 * Stratégie de threading :
 *  - Quand un mail entrant arrive sur `<alias>@asthia.fr`, on cherche un
 *    thread existant pour ce couple (user, client_email). S'il existe,
 *    on append le nouveau message. Sinon on en crée un.
 *  - On essaie aussi de matcher la facture/devis correspondant via le
 *    sujet du mail (regex sur "Facture F-XXXX-XXXX" / "Devis D-XXXX-XXXX")
 *    et on lie le thread. Best-effort : si on rate, le thread reste
 *    libre (ce qui est OK — c'est juste pour l'UX).
 *
 * On stocke le corps html/text du mail entrant en base parce que le
 * webhook Resend ne le contient pas (uniquement les metadata). On le
 * récupère via `resend.emails.receiving.get(emailId)`.
 */

const SUBJECT_INVOICE_RE = /\b(F-\d{4}-\d{3,5})\b/i;
const SUBJECT_QUOTE_RE = /\b(D-\d{4}-\d{3,5})\b/i;

/**
 * Récupère le corps complet du mail entrant côté Resend, parse l'expéditeur
 * (`from` peut être au format `"Nom" <email>` ou juste `email`), et insère
 * thread + message en base. Met à jour `last_message_at` et incrémente
 * `unread_count` sur le thread.
 */
export async function storeInboundMessage(
  admin: SupabaseClient,
  args: {
    ownerId: string;
    ownerAlias: string;
    emailId: string;
    from: string;
    subject: string;
    messageId: string | null;
    receivedAtIso: string;
  },
) {
  // 1. Fetch du corps via l'API Resend Inbound. Sans ça on n'aurait que
  //    le sujet à afficher dans la messagerie — peu utile.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquante — impossible de fetcher le corps");
  }
  const resend = new Resend(apiKey);
  const { data: emailData, error: getError } = await resend.emails.receiving.get(
    args.emailId,
  );
  if (getError) {
    console.warn("[messaging] receiving.get a échoué:", getError);
  }

  const { fromEmail, fromName } = parseFromHeader(args.from);

  // 2. Match facture/devis via le subject.
  const invoiceMatch = args.subject.match(SUBJECT_INVOICE_RE)?.[1];
  const quoteMatch = args.subject.match(SUBJECT_QUOTE_RE)?.[1];

  let invoiceId: string | null = null;
  let quoteId: string | null = null;
  if (invoiceMatch) {
    const { data } = await admin
      .from("invoices")
      .select("id")
      .eq("user_id", args.ownerId)
      .eq("number", invoiceMatch)
      .maybeSingle();
    invoiceId = data?.id ?? null;
  } else if (quoteMatch) {
    const { data } = await admin
      .from("quotes")
      .select("id")
      .eq("user_id", args.ownerId)
      .eq("number", quoteMatch)
      .maybeSingle();
    quoteId = data?.id ?? null;
  }

  // 3. Find or create thread. Critère de match : (user_id, client_email).
  //    Un seul thread par client — toutes les réponses du même client
  //    (sur n'importe quelle facture/devis) atterrissent dans la même
  //    conversation. C'est ce qui correspond au mental model de l'AE
  //    ("ma conversation avec ce client") plutôt que le découpage
  //    par document.
  //
  //    invoice_id / quote_id sont conservés comme "document d'origine"
  //    sur le thread : si le thread n'existe pas encore et qu'on peut
  //    déduire un doc depuis le subject, on le sauvegarde pour
  //    l'affichage. Si le thread existe déjà, on ne change pas son
  //    invoice_id (le premier reste prioritaire).
  let threadId: string | null = null;
  {
    const { data: existing } = await admin
      .from("message_threads")
      .select("id")
      .eq("user_id", args.ownerId)
      .eq("client_email", fromEmail.toLowerCase())
      .maybeSingle();
    threadId = existing?.id ?? null;
  }

  if (!threadId) {
    const { data: created, error: createErr } = await admin
      .from("message_threads")
      .insert({
        user_id: args.ownerId,
        client_email: fromEmail.toLowerCase(),
        client_name: fromName || null,
        subject: args.subject,
        invoice_id: invoiceId,
        quote_id: quoteId,
        last_message_at: args.receivedAtIso,
        unread_count: 1,
      })
      .select("id")
      .single();
    if (createErr) throw createErr;
    threadId = created.id;
  } else {
    // Increment unread + bump last_message_at via une mise à jour.
    // Pas d'`UPDATE … SET unread_count = unread_count + 1` direct dans
    // l'API Supabase, donc on lit + écrit. Race condition acceptable
    // pour un compteur (au pire on saute un +1, l'utilisateur verra
    // qu'il a un nouveau mail au prochain refresh).
    const { data: cur } = await admin
      .from("message_threads")
      .select("unread_count")
      .eq("id", threadId)
      .single();
    await admin
      .from("message_threads")
      .update({
        unread_count: (cur?.unread_count ?? 0) + 1,
        last_message_at: args.receivedAtIso,
      })
      .eq("id", threadId);
  }

  // 4. Insert message.
  const { error: msgErr } = await admin.from("messages").insert({
    thread_id: threadId,
    user_id: args.ownerId,
    direction: "inbound",
    from_email: fromEmail.toLowerCase(),
    from_name: fromName || null,
    to_email: `${args.ownerAlias}@asthia.fr`,
    subject: args.subject,
    html: typeof emailData?.html === "string" ? emailData.html : null,
    text: typeof emailData?.text === "string" ? emailData.text : null,
    resend_email_id: args.emailId,
    message_id: args.messageId,
    received_at: args.receivedAtIso,
  });
  if (msgErr) throw msgErr;

  return { threadId };
}

/**
 * Parse un header From RFC 5322 simplifié.
 *
 * Cas gérés :
 *  - `"Adrien Rabillat" <adrien@example.com>` → name + email
 *  - `Adrien Rabillat <adrien@example.com>` → name + email
 *  - `adrien@example.com` → email only
 *
 * On reste simple : pas de gestion de adresses encodées MIME (=?utf-8?...)
 * pour l'instant, ça arrive rarement avec les clients mail récents.
 */
export function parseFromHeader(raw: string): { fromEmail: string; fromName: string } {
  const trimmed = (raw ?? "").trim();
  const m = trimmed.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
  if (m) {
    return {
      fromName: m[1].trim().replace(/^"+|"+$/g, ""),
      fromEmail: m[2].trim(),
    };
  }
  // Pas de bracket → c'est juste l'email (ou rien).
  return { fromName: "", fromEmail: trimmed };
}
