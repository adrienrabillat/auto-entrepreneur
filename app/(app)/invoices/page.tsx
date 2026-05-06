import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { FileText, Plus } from "lucide-react";
import { DeleteDraftButton } from "./row-delete";
import { ExportExcelButton } from "@/components/ui/export-excel";
import { initialsFrom } from "@/lib/initials";
import { ListRowSkeleton } from "@/components/ui/skeleton";
import { cleanClientName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

/**
 * Liste des factures.
 *
 * Architecture streaming RSC : le wrapper de page rend immédiatement
 * l'en-tête (titre + boutons + filtres) sans attendre la requête DB. La
 * liste est isolée dans un composant <InvoicesListSection> async wrappé
 * dans <Suspense>. Quand l'utilisateur change de filtre via les pills,
 * `key={filter}` sur le Suspense déclenche le fallback à chaque nouvelle
 * valeur, ce qui donne une transition perçue beaucoup plus rapide
 * (l'en-tête ne re-flash pas, seule la liste refait un skeleton court).
 */

type Invoice = {
  id: string;
  number: string;
  client_name: string | null;
  client_email: string;
  description: string;
  amount_cents: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  issued_on: string;
  sent_at: string | null;
  paid_at: string | null;
  invoice_type?: string;
  imported?: boolean;
};

const STATUS_FILTERS = [
  { key: "all",   label: "Toutes" },
  { key: "draft", label: "Brouillons" },
  { key: "sent",  label: "En attente" },
  { key: "paid",  label: "Payées" },
] as const;

type FilterKey = (typeof STATUS_FILTERS)[number]["key"];

export default function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter = (searchParams.status ?? "all") as FilterKey;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">Factures</h1>
          <p className="mt-1 text-small text-ink-500">
            Historique de tes factures, avec statut d&apos;envoi et de paiement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:items-center">
          <ExportExcelButton />
          <Link href="/invoices/new" className="pill pill-primary">
            <Plus size={16} />
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* Segmented filter (style Revolut — pills sur surface-2) */}
      <div className="inline-flex bg-surface-2 p-1 rounded-full overflow-x-auto max-w-full">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
              className={
                "px-4 py-1.5 rounded-full text-small font-medium whitespace-nowrap transition-all " +
                (active
                  ? "bg-surface text-ink-900 shadow-hair"
                  : "text-ink-500 hover:text-ink-900")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* `key={filter}` : à chaque changement de filtre, le Suspense
          remonte et affiche à nouveau le fallback skeleton pendant que
          la nouvelle requête tourne. Sans la key, React garderait
          l'ancienne liste affichée jusqu'à la fin de la nouvelle requête. */}
      <Suspense key={filter} fallback={<InvoicesListSkeleton />}>
        <InvoicesListSection filter={filter} />
      </Suspense>
    </div>
  );
}

async function InvoicesListSection({ filter }: { filter: FilterKey }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  let q = supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user!.id)
    .order("issued_on", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);

  const { data: invoices = [] } = await q;
  const list = (invoices ?? []) as Invoice[];

  return (
    <div className="surface p-2">
      {list.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul>
          {list.map((inv) => {
            const displayName = cleanClientName(inv.client_name) || inv.client_email;
            const isCreditNote = inv.invoice_type === "credit_note";
            const isImported = Boolean(inv.imported);
            return (
              <li key={inv.id} className="relative group">
                <Link
                  href={`/invoices/${inv.id}`}
                  className="grid grid-cols-[auto_1fr_auto] gap-3.5 items-center px-3.5 py-3 rounded-2xl row-hover"
                >
                  <div className="avatar">{initialsFrom(displayName)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-medium text-ink-900 truncate">{inv.description}</span>
                      {isCreditNote ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warn-500/10 text-warn-700 px-2 py-0.5 text-[11px] font-semibold">
                          Avoir
                        </span>
                      ) : null}
                      {isImported ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 text-brand-700 px-2 py-0.5 text-[11px] font-semibold">
                          Importée
                        </span>
                      ) : null}
                      <StatusDot status={inv.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-ink-500 truncate">
                      <span className="tabular-nums">{inv.number}</span> · {displayName} · {formatDate(inv.issued_on)}
                      {inv.paid_at ? ` · payée le ${formatDate(inv.paid_at)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`text-body font-bold tabular-nums tracking-tight ${isCreditNote ? "text-danger-600" : "text-ink-900"}`}>
                      {formatEUR(inv.amount_cents)}
                    </div>
                    {inv.status === "draft" && !isCreditNote ? <div className="w-8" aria-hidden /> : null}
                  </div>
                </Link>
                {/* Bouton de suppression : brouillons STANDARD uniquement
                    (pas les avoirs ni les factures importées). */}
                {inv.status === "draft" && !isCreditNote && !isImported ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <DeleteDraftButton id={inv.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InvoicesListSkeleton() {
  return (
    <div className="surface p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { cls: string; label: string }> = {
    paid:      { cls: "paid",   label: "Payée" },
    sent:      { cls: "sent",   label: "Envoyée" },
    draft:     { cls: "draft",  label: "Brouillon" },
    cancelled: { cls: "cancel", label: "Annulée" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`status-dot ${cls}`}>
      <span className="d" aria-hidden />
      {label}
    </span>
  );
}

function EmptyState({ filter }: { filter: string }) {
  const msg =
    filter === "draft"
      ? "Aucun brouillon pour l'instant."
      : filter === "sent"
        ? "Aucune facture en attente de paiement."
        : filter === "paid"
          ? "Aucune facture payée pour l'instant."
          : "Aucune facture pour le moment.";
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600">
        <FileText size={22} />
      </div>
      <p className="text-body font-medium text-ink-900">{msg}</p>
      <p className="mt-1 text-small text-ink-500">Crée une nouvelle facture en moins d&apos;une minute.</p>
      <div className="mt-4">
        <Link href="/invoices/new" className="pill pill-primary">
          <Plus size={16} />
          Nouvelle facture
        </Link>
      </div>
    </div>
  );
}
