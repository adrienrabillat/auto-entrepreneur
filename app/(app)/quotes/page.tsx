import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { Download, FileText, Plus } from "lucide-react";
import { initialsFrom } from "@/lib/initials";
import { ListRowSkeleton } from "@/components/ui/skeleton";
import { cleanClientName } from "@/lib/display-name";
import { DeleteQuoteButton } from "./row-delete";

export const dynamic = "force-dynamic";

/**
 * Liste des devis avec filtre par statut. Calque /invoices côté UX et
 * côté streaming RSC : l'en-tête (titre + boutons + filtres) rend
 * immédiatement, la liste est isolée dans <QuotesListSection> wrappée
 * dans <Suspense> pour que les changements de filtre soient quasi-instants.
 *
 * Pas de bouton de suppression inline (la suppression se fait depuis le
 * détail, et seulement si le devis n'est pas converti en facture).
 */

type Quote = {
  id: string;
  number: string;
  client_name: string | null;
  client_email: string;
  description: string;
  amount_cents: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  issued_on: string;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  converted_invoice_id: string | null;
};

const STATUS_FILTERS = [
  { key: "all",      label: "Tous" },
  { key: "draft",    label: "Brouillons" },
  { key: "sent",     label: "Envoyés" },
  { key: "accepted", label: "Acceptés" },
  { key: "rejected", label: "Refusés" },
] as const;

type FilterKey = (typeof STATUS_FILTERS)[number]["key"];

export default function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter = (searchParams.status ?? "all") as FilterKey;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">Devis</h1>
          <p className="mt-1 text-small text-ink-500">
            Tes devis envoyés, leur statut et la conversion en facture quand ils sont acceptés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint 5 — uniformisation : on aligne sur le pattern Factures
              (Exporter à gauche, CTA primaire à droite). Le bouton primaire
              doit être en bout de ligne, c'est l'action que l'utilisateur
              cherche en priorité. */}
          <a
            href="/api/export/quotes"
            className="pill pill-ghost"
            aria-label="Exporter les devis en Excel"
          >
            <Download size={16} />
            Exporter
          </a>
          <Link href="/quotes/new" className="pill pill-primary">
            <Plus size={16} />
            Nouveau devis
          </Link>
        </div>
      </div>

      <div className="inline-flex bg-surface-2 p-1 rounded-full overflow-x-auto max-w-full">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/quotes" : `/quotes?status=${f.key}`}
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

      {/* key={filter} → re-suspend à chaque changement d'onglet pour que
          le skeleton s'affiche pendant la nouvelle requête au lieu de
          laisser l'ancienne liste figée. */}
      <Suspense key={filter} fallback={<QuotesListSkeleton />}>
        <QuotesListSection filter={filter} />
      </Suspense>
    </div>
  );
}

async function QuotesListSection({ filter }: { filter: FilterKey }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  let q = supabase
    .from("quotes")
    .select("*")
    .eq("user_id", user!.id)
    .order("issued_on", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);

  const { data: quotes = [] } = await q;
  const list = (quotes ?? []) as Quote[];

  return (
    <div className="surface p-2">
      {list.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul>
          {list.map((q) => {
            const displayName = cleanClientName(q.client_name) || q.client_email;
            const canDelete = !q.converted_invoice_id;
            return (
              <li key={q.id} className="relative group">
                <Link
                  href={`/quotes/${q.id}`}
                  className="grid grid-cols-[auto_1fr_auto] gap-3.5 items-center px-3.5 py-3 rounded-2xl row-hover"
                >
                  <div className="avatar">{initialsFrom(displayName)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-medium text-ink-900 truncate">{q.description}</span>
                      <StatusDot status={q.status} converted={Boolean(q.converted_invoice_id)} />
                    </div>
                    <div className="mt-0.5 text-xs text-ink-500 truncate">
                      <span className="tabular-nums">{q.number}</span> · {displayName} · {formatDate(q.issued_on)}
                      {q.valid_until ? ` · valable jusqu'au ${formatDate(q.valid_until)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-body font-bold tabular-nums tracking-tight text-ink-900">
                      {formatEUR(q.amount_cents)}
                    </div>
                    {canDelete ? <div className="w-8" aria-hidden /> : null}
                  </div>
                </Link>
                {canDelete ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <DeleteQuoteButton id={q.id} number={q.number} />
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

function QuotesListSkeleton() {
  return (
    <div className="surface p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Mêmes status-dots que les factures pour cohérence visuelle, plus un
 * cas spécifique "converti" (devis accepté ET facture créée).
 */
function StatusDot({
  status,
  converted,
}: {
  status: Quote["status"];
  converted: boolean;
}) {
  if (converted) {
    return (
      <span className="status-dot paid">
        <span className="d" aria-hidden />
        Converti en facture
      </span>
    );
  }
  const map: Record<Quote["status"], { cls: string; label: string }> = {
    accepted: { cls: "paid",   label: "Accepté" },
    sent:     { cls: "sent",   label: "Envoyé" },
    draft:    { cls: "draft",  label: "Brouillon" },
    rejected: { cls: "cancel", label: "Refusé" },
    expired:  { cls: "cancel", label: "Expiré" },
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
        ? "Aucun devis envoyé en attente de réponse."
        : filter === "accepted"
          ? "Aucun devis accepté pour l'instant."
          : filter === "rejected"
            ? "Aucun devis refusé."
            : "Aucun devis pour le moment.";
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600">
        <FileText size={22} />
      </div>
      <p className="text-body font-medium text-ink-900">{msg}</p>
      <p className="mt-1 text-small text-ink-500">
        Un devis se crée en moins d&apos;une minute.
      </p>
      <div className="mt-4">
        <Link href="/quotes/new" className="pill pill-primary">
          <Plus size={16} />
          Nouveau devis
        </Link>
      </div>
    </div>
  );
}
