import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { Badge, StatCard } from "@/components/ui/card";
import { monthLabel, formatEUR, formatDate } from "@/lib/format";
import { RunMyDeclaration } from "./run-button";
import { CalendarClock, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

type Declaration = {
  id: string;
  period_year: number;
  period_month: number;
  total_cents: number;
  status: "pending" | "submitted" | "confirmed" | "error" | "skipped";
  urssaf_reference: string | null;
  submitted_at: string | null;
  error_message: string | null;
};

export default async function DeclarationsPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  const now = new Date();
  const currentPeriodYear = now.getFullYear();
  const currentPeriodMonth = now.getMonth() + 1; // 1-12

  // Total collected for the current running month
  const firstOfThisMonth = new Date(currentPeriodYear, currentPeriodMonth - 1, 1).toISOString();

  // Three independent reads — fire them in parallel to save ~2 round-trips.
  const [runningInvRes, rowsRes, profileRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("amount_cents, paid_at")
      .eq("user_id", user!.id)
      .eq("status", "paid")
      .gte("paid_at", firstOfThisMonth),
    supabase
      .from("monthly_declarations")
      .select("*")
      .eq("user_id", user!.id)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false }),
    supabase
      .from("profiles")
      .select("urssaf_declaration_day")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const runningTotal = (runningInvRes.data ?? []).reduce(
    (s, i) => s + (i.amount_cents as number),
    0
  );
  const decls = (rowsRes.data ?? []) as Declaration[];
  const day = profileRes.data?.urssaf_declaration_day ?? 3;

  const nextMonthLabel = monthLabel(
    currentPeriodMonth === 12 ? currentPeriodYear + 1 : currentPeriodYear,
    currentPeriodMonth === 12 ? 1 : currentPeriodMonth + 1
  )
    .split(" ")
    .slice(0, 2)
    .join(" ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Déclarations <span className="text-gradient-brand">URSSAF</span></h1>
        <p className="mt-1 text-small text-ink-500">
          Chaque mois, le <strong className="text-ink-900">{day}</strong> au matin, l&apos;app déclare automatiquement ton chiffre
          d&apos;affaires encaissé du mois précédent.
          {process.env.URSSAF_LIVE === "true" ? null : (
            <span className="ml-1 italic">Mode test (mock) — les déclarations ne sont pas envoyées à l&apos;URSSAF tant que le mode live n&apos;est pas activé.</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <StatCard
          label={`Encaissé en ${monthLabel(currentPeriodYear, currentPeriodMonth)}`}
          value={formatEUR(runningTotal)}
          accent="success"
          icon={<TrendingUp size={16} />}
          hint={`Sera déclaré le ${day} ${nextMonthLabel}`}
        />
        <StatCard
          label="Prochaine déclaration"
          value={`${day} ${nextMonthLabel}`}
          accent="brand"
          icon={<CalendarClock size={16} />}
          hint="Automatique, tu n'as rien à faire"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-h2">Historique</h2>
          <RunMyDeclaration />
        </div>
        <div className="surface overflow-hidden">
          {decls.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-subtle">
                <CalendarClock className="text-brand-600" size={22} />
              </div>
              <p className="text-body font-semibold text-ink-900">Aucune déclaration pour le moment.</p>
              <p className="mt-1 text-small text-ink-500">L&apos;historique apparaîtra dès la première déclaration.</p>
            </div>
          ) : (
            <ul>
              {decls.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-4 px-4 py-4 md:px-5 border-b border-ink-100 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold capitalize text-ink-900">
                        {monthLabel(d.period_year, d.period_month)}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    {d.urssaf_reference ? (
                      <div className="mt-0.5 text-xs text-ink-500 font-mono truncate">{d.urssaf_reference}</div>
                    ) : null}
                    {d.error_message ? (
                      <div className="text-xs text-danger-600 mt-0.5 truncate">{d.error_message}</div>
                    ) : d.submitted_at ? (
                      <div className="text-xs text-ink-500 mt-0.5">Envoyée le {formatDate(d.submitted_at)}</div>
                    ) : null}
                  </div>
                  <div className="text-body font-bold tabular-nums text-ink-900">{formatEUR(d.total_cents)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: Declaration["status"] }) {
  switch (status) {
    case "submitted":
      return <Badge tone="success">Envoyée</Badge>;
    case "confirmed":
      return <Badge tone="success">Confirmée</Badge>;
    case "pending":
      return <Badge tone="warn">En attente</Badge>;
    case "skipped":
      return <Badge tone="neutral">Non applicable</Badge>;
    case "error":
      return <Badge tone="danger">Erreur</Badge>;
  }
}
