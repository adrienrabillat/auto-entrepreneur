import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatEUR } from "@/lib/format";
import { FileText, Plus } from "lucide-react";
import { DeleteDraftButton } from "./row-delete";

export const dynamic = "force-dynamic";

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
};

const STATUS_FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "draft", label: "Brouillons" },
  { key: "sent", label: "En attente" },
  { key: "paid", label: "Payées" },
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const filter = (searchParams.status ?? "all") as (typeof STATUS_FILTERS)[number]["key"];
  let q = supabase.from("invoices").select("*").eq("user_id", user!.id).order("issued_on", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);

  const { data: invoices = [] } = await q;
  const list = (invoices ?? []) as Invoice[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">Factures</h1>
          <p className="mt-1 text-small text-ink-500">
            Historique de tes factures, avec statut d&apos;envoi et de paiement.
          </p>
        </div>
        <Link href="/invoices/new" className="sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            <Plus size={18} />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      <nav className="flex gap-2 text-small overflow-x-auto -mx-1 px-1 pb-1">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
              className={
                active
                  ? "px-4 py-2 rounded-full font-semibold text-white bg-brand-gradient shadow-pop whitespace-nowrap"
                  : "px-4 py-2 rounded-full font-medium text-ink-600 bg-white ring-1 ring-ink-200 hover:ring-brand-300 hover:text-brand-700 whitespace-nowrap"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="surface overflow-hidden">
        {list.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul>
            {list.map((inv) => (
              <li key={inv.id} className="relative group border-b border-ink-100 last:border-0">
                <Link
                  href={`/invoices/${inv.id}`}
                  className="row-hover flex items-center gap-3 px-4 py-4 md:px-5"
                >
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-subtle text-brand-600">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink-900 truncate">{inv.description}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="mt-0.5 text-small text-ink-500 truncate">
                      <span className="tabular-nums">{inv.number}</span> · {inv.client_name || inv.client_email} · {formatDate(inv.issued_on)}
                      {inv.paid_at ? ` · payée le ${formatDate(inv.paid_at)}` : ""}
                    </div>
                  </div>
                  <div className="text-body font-bold tabular-nums text-ink-900 shrink-0">
                    {formatEUR(inv.amount_cents)}
                  </div>
                  {/* Spacer reserved for the delete button on drafts so tap target doesn't overlap */}
                  {inv.status === "draft" ? <div className="w-9 shrink-0" aria-hidden /> : null}
                </Link>
                {inv.status === "draft" ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <DeleteDraftButton id={inv.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "paid") return <Badge tone="success">Payée</Badge>;
  if (status === "sent") return <Badge tone="warn">Envoyée</Badge>;
  if (status === "cancelled") return <Badge tone="danger">Annulée</Badge>;
  return <Badge tone="neutral">Brouillon</Badge>;
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
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-subtle">
        <FileText className="text-brand-600" size={22} />
      </div>
      <p className="text-body font-semibold text-ink-900">{msg}</p>
      <p className="mt-1 text-small text-ink-500">Crée une nouvelle facture en moins d&apos;une minute.</p>
      <div className="mt-4">
        <Link href="/invoices/new">
          <Button>
            <Plus size={16} />
            Nouvelle facture
          </Button>
        </Link>
      </div>
    </div>
  );
}
