import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { StatCard } from "@/components/ui/card";
import { monthLabel, formatEUR, formatDate } from "@/lib/format";
import { RunMyDeclaration } from "./run-button";
import { ExportExcelButton } from "@/components/ui/export-excel";
import { CalendarClock, FileSpreadsheet, ArrowRight } from "lucide-react";

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
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-h1">Déclarations URSSAF</h1>
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
          hint={`Sera déclaré le ${day} ${nextMonthLabel}`}
        />
        <StatCard
          label="Prochaine déclaration"
          value={`${day} ${nextMonthLabel}`}
          accent="brand"
          hint="Automatique, tu n'as rien à faire"
        />
      </div>

      {/* Lien vers /import — visible pour tous (pas conditionné à
          had_prior_activity) afin que les AE qui ont oublié de cocher la
          case à l'onboarding puissent quand même y accéder. Sprint 4 — B2. */}
      <Link
        href="/import"
        className="surface p-4 flex items-center gap-3 hover:shadow-pop transition-shadow group"
      >
        <div className="h-10 w-10 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0">
          <FileSpreadsheet size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium text-ink-900">
            Importer du CA déjà encaissé
          </p>
          <p className="text-xs text-ink-500">
            Si tu as démarré ton activité avant Asthia, saisis ton CA passé
            ici pour qu&apos;il soit pris en compte dans les déclarations URSSAF.
          </p>
        </div>
        <ArrowRight size={16} className="text-ink-400 group-hover:text-brand-600 transition-colors shrink-0" />
      </Link>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-h2">Historique</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportExcelButton />
            <RunMyDeclaration />
          </div>
        </div>
        <div className="surface p-2">
          {decls.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600">
                <CalendarClock size={22} />
              </div>
              <p className="text-body font-medium text-ink-900">Aucune déclaration pour le moment.</p>
              <p className="mt-1 text-small text-ink-500">L&apos;historique apparaîtra dès la première déclaration.</p>
            </div>
          ) : (
            <ul>
              {decls.map((d) => (
                <li key={d.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-3.5 py-3 rounded-2xl row-hover">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-medium capitalize text-ink-900">
                        {monthLabel(d.period_year, d.period_month)}
                      </span>
                      <StatusDot status={d.status} />
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
                  <div className="text-body font-bold tabular-nums tracking-tight text-ink-900">
                    {formatEUR(d.total_cents)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: Declaration["status"] }) {
  const map: Record<Declaration["status"], { cls: string; label: string }> = {
    submitted: { cls: "paid",   label: "Envoyée" },
    confirmed: { cls: "paid",   label: "Confirmée" },
    pending:   { cls: "sent",   label: "En attente" },
    skipped:   { cls: "draft",  label: "Non applicable" },
    error:     { cls: "cancel", label: "Erreur" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`status-dot ${cls}`}>
      <span className="d" aria-hidden />
      {label}
    </span>
  );
}
