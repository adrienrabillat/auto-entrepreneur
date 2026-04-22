import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatEUR } from "@/lib/format";
import { Plus } from "lucide-react";

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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-h1">Factures</h1>
          <p className="mt-1 text-small text-ink-500">
            Historique de tes factures, avec statut d&apos;envoi et de paiement.
          </p>
        </div>
        <Link href="/invoices/new">
          <Button size="lg">
            <Plus size={16} />
            Nouvelle
          </Button>
        </Link>
      </div>

      <nav className="flex gap-1 text-small">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
            className={`px-3 py-1.5 rounded-md ${
              filter === f.key ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="surface overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center text-small text-ink-500">Aucune facture.</div>
        ) : (
          <ul>
            {list.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="row-hover flex items-center gap-4 px-4 py-3 border-b border-ink-200 last:border-0"
                >
                  <div className="w-20 text-small text-ink-500 tabular-nums shrink-0">{inv.number}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-800 truncate">{inv.description}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-small text-ink-500 truncate">
                      {inv.client_name || inv.client_email} · émise le {formatDate(inv.issued_on)}
                      {inv.paid_at ? ` · payée le ${formatDate(inv.paid_at)}` : ""}
                    </div>
                  </div>
                  <div className="text-body font-medium tabular-nums text-ink-900">
                    {formatEUR(inv.amount_cents)}
                  </div>
                </Link>
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
