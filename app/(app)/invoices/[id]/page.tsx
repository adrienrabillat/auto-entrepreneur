import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { InvoiceActions } from "./actions";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cleanClientName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const [invoiceRes, profileRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("gmail_refresh_token, gmail_connected_email")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const invoice = invoiceRes.data;
  if (!invoice) notFound();
  const gmailConnected = Boolean(profileRes.data?.gmail_refresh_token);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={14} /> Factures
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-small text-ink-500">Facture</div>
            <h1 className="text-h1 tabular-nums">{invoice.number}</h1>
          </div>
          <StatusDot status={invoice.status} />
        </div>
      </div>

      {/* Hero montant — card surface avec chiffre XL */}
      <section className="surface relative overflow-hidden p-7 md:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle at center, var(--accent-soft) 0%, transparent 65%)" }}
        />
        <div className="relative">
          <div className="text-small text-ink-500">Montant</div>
          <div
            className="mt-1 font-bold tabular-nums tracking-[-0.035em] leading-none text-ink-900"
            style={{ fontSize: "clamp(44px, 6vw, 64px)" }}
          >
            {formatEUR(invoice.amount_cents)}
          </div>
          <div className="mt-3 text-small text-ink-500">
            Pour {cleanClientName(invoice.client_name) || invoice.client_email}
          </div>
        </div>
      </section>

      <section className="surface p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-small">
          <Field label="Client">{cleanClientName(invoice.client_name) || invoice.client_email}</Field>
          <Field label="Email">{invoice.client_email}</Field>
          <Field label="Émise le">{formatDate(invoice.issued_on)}</Field>
          <Field label="Envoyée le">{invoice.sent_at ? formatDate(invoice.sent_at) : "—"}</Field>
          <Field label="Payée le">{invoice.paid_at ? formatDate(invoice.paid_at) : "—"}</Field>
        </div>
        <div>
          <div className="text-small text-ink-500 mb-1">Description</div>
          <p className="text-body text-ink-800 whitespace-pre-wrap">{invoice.description}</p>
        </div>

        <InvoiceActions invoice={invoice} gmailConnected={gmailConnected} />
      </section>

      <section className="surface p-0 overflow-hidden">
        <div className="px-4 py-3 text-small flex items-center justify-between">
          <span className="font-medium text-ink-700">Aperçu PDF</span>
          <a
            className="inline-flex items-center gap-1 text-small font-medium text-brand-600 hover:text-brand-700 transition-colors"
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir <ExternalLink size={14} />
          </a>
        </div>
        <iframe
          src={`/api/invoices/${invoice.id}/pdf`}
          title={`Facture ${invoice.number}`}
          className="w-full h-[600px] bg-surface-2"
        />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="text-ink-800 font-medium">{children}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    paid:      { cls: "paid",   label: "Payée" },
    sent:      { cls: "sent",   label: "Envoyée" },
    draft:     { cls: "draft",  label: "Brouillon" },
    cancelled: { cls: "cancel", label: "Annulée" },
  };
  const { cls, label } = map[status] ?? map.draft;
  return (
    <span className={`status-dot ${cls}`}>
      <span className="d" aria-hidden />
      {label}
    </span>
  );
}
