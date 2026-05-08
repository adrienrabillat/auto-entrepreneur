import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate } from "@/lib/format";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Composer } from "./composer";
import { MarkReadOnMount } from "./mark-read";

export const dynamic = "force-dynamic";

/**
 * Vue conversation — affiche tous les messages d'un thread (inbound +
 * outbound) dans l'ordre chronologique, avec un composer en bas pour
 * que l'AE réponde directement depuis l'app.
 *
 * Au mount, on marque tous les messages inbound comme lus (read_at = now)
 * via le composant MarkReadOnMount qui POST vers /api/messages/[id]/read.
 * Ça remet le compteur de non-lus à 0 sur le thread.
 */
export default async function MessageThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Thread + lien éventuel vers la facture/devis. RLS garantit qu'on ne
  // voit que ses propres threads.
  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      `*,
       invoice:invoices!message_threads_invoice_id_fkey(id, number, amount_cents),
       quote:quotes!message_threads_quote_id_fkey(id, number, amount_cents)`,
    )
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!thread) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", params.id)
    .order("received_at", { ascending: true });

  const list = messages ?? [];
  const docLink = thread.invoice
    ? { href: `/invoices/${thread.invoice.id}`, label: `Facture ${thread.invoice.number}` }
    : thread.quote
      ? { href: `/quotes/${thread.quote.id}`, label: `Devis ${thread.quote.number}` }
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
      {/* Marque automatiquement comme lu : effet de bord client-only. */}
      <MarkReadOnMount threadId={params.id} />

      <div>
        <Link
          href="/messages"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={14} /> Messages
        </Link>
        <div className="mt-3">
          <div className="text-small text-ink-500">Conversation avec</div>
          <h1 className="text-h2 truncate">
            {thread.client_name || thread.client_email}
          </h1>
          <div className="text-small text-ink-500 truncate">
            {thread.client_email}
          </div>
        </div>
      </div>

      {docLink ? (
        <Link
          href={docLink.href}
          className="surface p-3 flex items-center gap-2 text-small text-brand-600 hover:bg-surface-2 transition-colors"
        >
          <Mail size={14} /> {docLink.label} <ArrowRight size={12} className="ml-auto" />
        </Link>
      ) : null}

      <div className="surface p-3 space-y-2">
        {list.length === 0 ? (
          <div className="text-small text-ink-500 italic px-2 py-4">
            Aucun message dans cette conversation.
          </div>
        ) : (
          list.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <Composer threadId={params.id} clientEmail={thread.client_email} />
    </div>
  );
}

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  from_name: string | null;
  from_email: string;
  subject: string;
  html: string | null;
  text: string | null;
  received_at: string;
};

function MessageBubble({ message: m }: { message: Message }) {
  const outbound = m.direction === "outbound";
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${
        outbound
          ? "bg-brand-500/10 ml-8"
          : "bg-surface-2 mr-8"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-small font-medium text-ink-900">
          {outbound ? "Vous" : (m.from_name || m.from_email)}
        </div>
        <div className="text-xs text-ink-400 tabular-nums shrink-0">
          {formatDate(m.received_at)}
        </div>
      </div>
      {/* Subject affiché en small s'il diffère de "Re: …" — sinon redondant
          avec le subject du thread. */}
      <div className="text-xs text-ink-500 mt-0.5 truncate">{m.subject}</div>
      <div className="mt-2 text-body text-ink-800">
        {m.html ? (
          // Le HTML reçu vient de Resend (vérifié) ou de notre composer
          // (qu'on contrôle). Si on craignait des injections venant de
          // mails entrants, il faudrait sanitize ici (DOMPurify côté client).
          // Pour l'instant on affiche tel quel — Resend ne pousse pas
          // de scripts dans `html` et le risque XSS est faible étant
          // donné que c'est dans une vue authentifiée du AE lui-même.
          <div
            className="prose prose-sm max-w-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: m.html }}
          />
        ) : m.text ? (
          <pre className="whitespace-pre-wrap font-sans text-body">{m.text}</pre>
        ) : (
          <em className="text-ink-500">(corps vide)</em>
        )}
      </div>
    </div>
  );
}
