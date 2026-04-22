import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/card";
import { monthLabel, formatEUR, formatDate } from "@/lib/format";
import { RunMyDeclaration } from "./run-button";

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
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const currentPeriodYear = now.getFullYear();
  const currentPeriodMonth = now.getMonth() + 1; // 1-12

  // Total collected for the current running month
  const firstOfThisMonth = new Date(currentPeriodYear, currentPeriodMonth - 1, 1).toISOString();
  const { data: runningInv = [] } = await supabase
    .from("invoices")
    .select("amount_cents, paid_at")
    .eq("user_id", user!.id)
    .eq("status", "paid")
    .gte("paid_at", firstOfThisMonth);
  const runningTotal = (runningInv ?? []).reduce((s, i) => s + (i.amount_cents as number), 0);

  const { data: rows = [] } = await supabase
    .from("monthly_declarations")
    .select("*")
    .eq("user_id", user!.id)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  const decls = (rows ?? []) as Declaration[];

  const { data: profile } = await supabase
    .from("profiles")
    .select("urssaf_declaration_day")
    .eq("id", user!.id)
    .maybeSingle();
  const day = profile?.urssaf_declaration_day ?? 3;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Déclarations URSSAF</h1>
        <p className="mt-1 text-small text-ink-500">
          Chaque mois, le <strong>{day}</strong> au matin, l&apos;app déclare automatiquement ton chiffre
          d&apos;affaires encaissé du mois précédent.
          {process.env.URSSAF_LIVE === "true" ? null : (
            <span className="ml-1 italic">Mode test (mock) — les déclarations ne sont pas envoyées à l&apos;URSSAF tant que le mode live n&apos;est pas activé.</span>
          )}
        </p>
      </div>

      <div className="surface p-5">
        <div className="text-small text-ink-500">Mois en cours</div>
        <div className="mt-1 text-h2 text-ink-900">{monthLabel(currentPeriodYear, currentPeriodMonth)}</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-small text-ink-500">Encaissé jusqu&apos;ici</div>
            <div className="text-h2 tabular-nums text-success-600">{formatEUR(runningTotal)}</div>
          </div>
          <div className="flex md:items-end">
            <p className="text-small text-ink-500">
              Ce montant sera déclaré automatiquement le {day} {monthLabel(
                currentPeriodMonth === 12 ? currentPeriodYear + 1 : currentPeriodYear,
                currentPeriodMonth === 12 ? 1 : currentPeriodMonth + 1
              ).split(" ").slice(0, 2).join(" ")}.
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2">Historique</h2>
          <RunMyDeclaration />
        </div>
        <div className="surface overflow-hidden">
          {decls.length === 0 ? (
            <div className="p-10 text-center text-small text-ink-500">Aucune déclaration pour le moment.</div>
          ) : (
            <ul>
              {decls.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-4 px-4 py-3 border-b border-ink-200 last:border-0"
                >
                  <div className="w-40 text-small capitalize text-ink-700">
                    {monthLabel(d.period_year, d.period_month)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      {d.urssaf_reference ? (
                        <span className="text-xs text-ink-500 font-mono truncate">{d.urssaf_reference}</span>
                      ) : null}
                    </div>
                    {d.error_message ? (
                      <div className="text-xs text-danger-600 mt-0.5 truncate">{d.error_message}</div>
                    ) : d.submitted_at ? (
                      <div className="text-xs text-ink-500 mt-0.5">Envoyée le {formatDate(d.submitted_at)}</div>
                    ) : null}
                  </div>
                  <div className="text-body font-medium tabular-nums">{formatEUR(d.total_cents)}</div>
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
