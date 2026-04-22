import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, StatCard } from "@/components/ui/card";
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
  paid_at: string | null;
  sent_at: string | null;
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const { data: invoices = [] } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user!.id)
    .order("issued_on", { ascending: false })
    .limit(100);

  const all = (invoices ?? []) as Invoice[];

  const monthCollected = all
    .filter((i) => i.paid_at && new Date(i.paid_at) >= monthStart)
    .reduce((s, i) => s + i.amount_cents, 0);

  const yearCollected = all
    .filter((i) => i.paid_at && new Date(i.paid_at) >= yearStart)
    .reduce((s, i) => s + i.amount_cents, 0);

  const outstanding = all
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + i.amount_cents, 0);

  const recent = all.slice(0, 6);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, metier")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-h1">Bonjour {profile?.display_name?.split(" ")[0] ?? ""}</h1>
          <p className="mt-1 text-small text-ink-500">
            {profile?.metier ? `${profile.metier} · ` : ""}Voici ton activité en ce moment.
          </p>
        </div>
        <Link href="/invoices/new">
          <Button size="lg">
            <Plus size={16} />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          label="Encaissé ce mois"
          value={formatEUR(monthCollected)}
          accent="success"
          hint="Sera déclaré à l'URSSAF"
        />
        <StatCard
          label="En attente de paiement"
          value={formatEUR(outstanding)}
          accent="warn"
          hint="Factures envoyées, non payées"
        />
        <StatCard label="Encaissé cette année" value={formatEUR(yearCollected)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2">Dernières factures</h2>
          <Link href="/invoices" className="text-small text-ink-500 hover:text-ink-800">
            Tout voir →
          </Link>
        </div>
        <div className="surface overflow-hidden">
          {recent.length === 0 ? (
            <EmptyInvoices />
          ) : (
            <ul>
              {recent.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="row-hover flex items-center gap-4 px-4 py-3 border-b border-ink-200 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-800 truncate">{inv.description}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="text-small text-ink-500 truncate">
                        {inv.number} · {inv.client_name || inv.client_email} · {formatDate(inv.issued_on)}
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
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "paid") return <Badge tone="success">Payée</Badge>;
  if (status === "sent") return <Badge tone="warn">Envoyée</Badge>;
  if (status === "cancelled") return <Badge tone="danger">Annulée</Badge>;
  return <Badge tone="neutral">Brouillon</Badge>;
}

function EmptyInvoices() {
  return (
    <div className="p-10 text-center">
      <p className="text-small text-ink-500">Aucune facture pour le moment.</p>
      <div className="mt-3">
        <Link href="/invoices/new">
          <Button>Créer ma première facture</Button>
        </Link>
      </div>
    </div>
  );
}
