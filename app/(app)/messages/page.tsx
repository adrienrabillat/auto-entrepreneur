import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate } from "@/lib/format";
import { MessageSquare, Mail, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Liste des conversations (threads) — page d'entrée de la messagerie.
 *
 * Un thread regroupe tous les messages échangés entre l'AE et un client
 * sur le contexte d'une facture/devis (ou d'une conversation libre si
 * aucun document n'est lié). On affiche le dernier message + le compteur
 * de non-lus + le lien vers la facture/devis associé.
 */
export default async function MessagesPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Embed du dernier message de chaque thread + le numéro de
  // facture/devis pour l'affichage. La policy RLS "self" assure qu'on ne
  // voit que ses propres threads.
  const { data: threads } = await supabase
    .from("message_threads")
    .select(
      `id, client_email, client_name, subject, last_message_at, unread_count,
       invoice:invoices!message_threads_invoice_id_fkey(id, number),
       quote:quotes!message_threads_quote_id_fkey(id, number)`,
    )
    .eq("user_id", user!.id)
    .order("last_message_at", { ascending: false });

  type ThreadRow = {
    id: string;
    client_email: string;
    client_name: string | null;
    subject: string;
    last_message_at: string;
    unread_count: number;
    invoice: { id: string; number: string } | null;
    quote: { id: string; number: string } | null;
  };
  const list = (threads ?? []) as unknown as ThreadRow[];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-h1">Messages</h1>
        <p className="mt-1 text-small text-ink-500">
          Toutes les réponses de tes clients à tes factures et devis,
          regroupées en conversations.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="surface p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
            <MessageSquare size={20} />
          </div>
          <div className="font-medium text-ink-900">Aucun message pour l&apos;instant</div>
          <div className="text-small text-ink-500 max-w-md mx-auto">
            Quand un client répondra à une facture ou un devis envoyé via
            Asthia, sa réponse apparaîtra ici. Tu pourras lui répondre
            directement depuis l&apos;app, et la conversation restera
            attachée au document concerné.
          </div>
        </div>
      ) : (
        <div className="surface overflow-hidden divide-y divide-ink-100">
          {list.map((t) => {
            const docLink = t.invoice
              ? { href: `/invoices/${t.invoice.id}`, label: `Facture ${t.invoice.number}` }
              : t.quote
                ? { href: `/quotes/${t.quote.id}`, label: `Devis ${t.quote.number}` }
                : null;
            const isUnread = t.unread_count > 0;
            return (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className="block px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 shrink-0 grid place-items-center rounded-2xl ${
                      isUnread
                        ? "bg-brand-500 text-white"
                        : "bg-surface-2 text-ink-500"
                    }`}
                  >
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-small ${
                          isUnread
                            ? "font-semibold text-ink-900"
                            : "font-medium text-ink-700"
                        }`}
                      >
                        {t.client_name || t.client_email}
                      </span>
                      {isUnread ? (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-500 text-white tabular-nums">
                          {t.unread_count}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-ink-400 tabular-nums">
                        {formatDate(t.last_message_at)}
                      </span>
                    </div>
                    <div
                      className={`text-small truncate ${
                        isUnread ? "text-ink-700" : "text-ink-500"
                      }`}
                    >
                      {t.subject}
                    </div>
                    {docLink ? (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600">
                        {docLink.label} <ArrowRight size={12} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
