import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { StatCard } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/format";
import { Plus, UserPlus, Download } from "lucide-react";
import { HeroAmount } from "./hero-amount";
import { initialsFrom } from "@/lib/initials";

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
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = monthStart;
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [invoicesRes, profileRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user!.id)
      .order("issued_on", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const all = (invoicesRes.data ?? []) as Invoice[];
  const profile = profileRes.data;

  const sumBetween = (from: Date, to?: Date) =>
    all
      .filter((i) => {
        if (!i.paid_at) return false;
        const d = new Date(i.paid_at);
        if (d < from) return false;
        if (to && d >= to) return false;
        return true;
      })
      .reduce((s, i) => s + i.amount_cents, 0);

  const monthCollected = sumBetween(monthStart);
  const prevMonthCollected = sumBetween(prevMonthStart, prevMonthEnd);
  const yearCollected = sumBetween(yearStart);

  const outstandingInvoices = all.filter((i) => i.status === "sent");
  const outstanding = outstandingInvoices.reduce((s, i) => s + i.amount_cents, 0);

  const deltaPct =
    prevMonthCollected > 0
      ? Math.round(((monthCollected - prevMonthCollected) / prevMonthCollected) * 100)
      : null;

  const recent = all.slice(0, 6);
  const firstName = profile?.display_name?.split(" ")[0] ?? "";
  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* HERO KPI */}
      <section className="surface relative overflow-hidden p-6 md:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, var(--accent-soft) 0%, transparent 65%)",
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 text-small text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" aria-hidden />
            Encaissé ce mois · {monthLabel}
          </div>

          <HeroAmount cents={monthCollected} />

          {deltaPct !== null ? (
            <div
              className={
                "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-medium " +
                (deltaPct >= 0
                  ? "bg-success-500/10 text-success-600"
                  : "bg-danger-500/10 text-danger-600")
              }
            >
              <span aria-hidden>{deltaPct >= 0 ? "↗" : "↘"}</span>
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct} % vs. mois précédent
            </div>
          ) : monthCollected > 0 ? null : (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small text-ink-500 bg-surface-2">
              Premier mois — aucune comparaison possible
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/invoices/new" className="pill pill-primary">
              <Plus size={16} />
              Nouvelle facture
            </Link>
            <Link href="/clients/new" className="pill pill-ghost">
              <UserPlus size={16} />
              Ajouter un client
            </Link>
            <a
              href="/api/export/xlsx"
              className="pill pill-ghost"
              aria-label="Exporter en Excel"
            >
              <Download size={16} />
              Exporter
            </a>
          </div>
        </div>
      </section>

      {/* 2 stats — en attente + année */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard
          label="En attente de paiement"
          value={formatEUR(outstanding)}
          accent="warn"
          hint={
            outstandingInvoices.length > 0
              ? `${outstandingInvoices.length} facture${
                  outstandingInvoices.length > 1 ? "s" : ""
                } envoyée${outstandingInvoices.length > 1 ? "s" : ""}, non payée${
                  outstandingInvoices.length > 1 ? "s" : ""
                }`
              : "Tout est à jour"
          }
        />
        <StatCard
          label={`Encaissé ${now.getFullYear()}`}
          value={formatEUR(yearCollected)}
          accent="brand"
        />
      </div>

      {/* Liste factures */}
      <section className="surface p-2">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-h3">Dernières factures</h2>
          <Link
            href="/invoices"
            className="text-small font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Tout voir →
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyInvoices />
        ) : (
          <ul className="pb-1">
            {recent.map((inv) => {
              const displayName = inv.client_name || inv.client_email;
              const initials = initialsFrom(displayName);
              return (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-[auto_1fr_auto] gap-3.5 items-center px-3.5 py-3 rounded-2xl row-hover"
                  >
                    <div className="avatar">{initials}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-medium text-ink-900 truncate">
                          {inv.description}
                        </span>
                        <StatusDot status={inv.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-ink-500 truncate">
                        {inv.number} · {displayName} · {formatDate(inv.issued_on)}
                      </div>
                    </div>
                    <div className="text-body font-bold tabular-nums tracking-tight text-ink-900">
                      {formatEUR(inv.amount_cents)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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

function EmptyInvoices() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600">
        <Plus size={22} />
      </div>
      <p className="text-body font-medium text-ink-900">Aucune facture pour le moment</p>
      <p className="mt-1 text-small text-ink-500">Crée ta première en moins d&apos;une minute.</p>
      <div className="mt-4">
        <Link href="/invoices/new" className="pill pill-primary">
          <Plus size={16} />
          Créer ma première facture
        </Link>
      </div>
    </div>
  );
}

