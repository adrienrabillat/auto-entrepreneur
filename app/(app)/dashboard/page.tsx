import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { Badge, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatEUR } from "@/lib/format";
import { Clock, Plus, TrendingUp, Wallet } from "lucide-react";

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
  const user = await getCurrentUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Run the two Supabase reads in parallel — neither depends on the other.
  const [invoicesRes, profileRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user!.id)
      .order("issued_on", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("display_name, metier")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const all = (invoicesRes.data ?? []) as Invoice[];
  const profile = profileRes.data;

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

  const firstName = profile?.display_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">
            Bonjour <span className="text-gradient-brand">{firstName}</span>
          </h1>
          <p className="mt-1 text-small text-ink-500">
            {profile?.metier ? `${profile.metier} · ` : ""}Voici ton activité en ce moment.
          </p>
        </div>
        <Link href="/invoices/new" className="sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            <Plus size={18} />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          label="Encaissé ce mois"
          value={formatEUR(monthCollected)}
          accent="success"
          icon={<TrendingUp size={16} />}
          hint="Sera déclaré à l'URSSAF"
        />
        <StatCard
          label="En attente de paiement"
          value={formatEUR(outstanding)}
          accent="warn"
          icon={<Clock size={16} />}
          hint="Factures envoyées, non payées"
        />
        <StatCard
          label="Encaissé cette année"
          value={formatEUR(yearCollected)}
          accent="brand"
          icon={<Wallet size={16} />}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2">Dernières factures</h2>
          <Link href="/invoices" className="text-small font-semibold text-brand-600 hover:text-brand-700">
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
                    className="row-hover flex items-center gap-4 px-4 py-4 md:px-5 border-b border-ink-100 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink-900 truncate">{inv.description}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="mt-0.5 text-small text-ink-500 truncate">
                        {inv.number} · {inv.client_name || inv.client_email} · {formatDate(inv.issued_on)}
                      </div>
                    </div>
                    <div className="text-body font-bold tabular-nums text-ink-900">
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
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-subtle">
        <Plus className="text-brand-600" size={22} />
      </div>
      <p className="text-body font-semibold text-ink-900">Aucune facture pour le moment</p>
      <p className="mt-1 text-small text-ink-500">Crée ta première en moins d&apos;une minute.</p>
      <div className="mt-4">
        <Link href="/invoices/new">
          <Button>Créer ma première facture</Button>
        </Link>
      </div>
    </div>
  );
}
