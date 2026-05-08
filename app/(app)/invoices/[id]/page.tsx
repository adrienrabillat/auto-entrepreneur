import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { InvoiceActions } from "./actions";
import { ArrowLeft, ExternalLink, FileWarning } from "lucide-react";
import { cleanClientName } from "@/lib/display-name";
import { SavedFlash } from "@/components/ui/saved-flash";
import { canSendEmail } from "@/lib/delivery/availability";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const invoiceRes = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  const invoice = invoiceRes.data;
  if (!invoice) notFound();
  // Capacité d'envoi : Resend uniquement (Gmail décommissionné mai 2026).
  const sendEnabled = canSendEmail();

  const isCreditNote = invoice.invoice_type === "credit_note";
  const docLabel = isCreditNote ? "Avoir" : "Facture";

  // Si c'est un avoir, charger la facture originale pour le lien
  let originalInvoice: { id: string; number: string } | null = null;
  if (isCreditNote && invoice.related_invoice_id) {
    const { data } = await supabase
      .from("invoices")
      .select("id, number")
      .eq("id", invoice.related_invoice_id)
      .eq("user_id", user!.id)
      .maybeSingle();
    originalInvoice = data;
  }

  // Charger les avoirs liés à cette facture (si c'est une facture standard)
  let linkedCreditNotes: { id: string; number: string; amount_cents: number; status: string }[] = [];
  if (!isCreditNote) {
    const { data } = await supabase
      .from("invoices")
      .select("id, number, amount_cents, status")
      .eq("related_invoice_id", invoice.id)
      .eq("user_id", user!.id)
      .eq("invoice_type", "credit_note")
      .order("created_at", { ascending: false });
    linkedCreditNotes = data ?? [];
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      {/* Toast "Modifications enregistrées" — apparaît si on arrive depuis
          /edit avec ?saved=1, puis disparaît tout seul après 2,5 s. */}
      <SavedFlash />

      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={14} /> Factures
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-small text-ink-500">{docLabel}</div>
            <h1 className="text-h1 tabular-nums">{invoice.number}</h1>
            {invoice.draft_number && invoice.draft_number !== invoice.number ? (
              <div className="text-xs text-ink-400 mt-0.5">
                (anciennement {invoice.draft_number})
              </div>
            ) : null}
          </div>
          <StatusDot status={invoice.status} isCreditNote={isCreditNote} />
        </div>
      </div>

      {/* Bandeau avoir */}
      {isCreditNote ? (
        <div className="rounded-2xl bg-warn-500/10 p-4 flex items-start gap-3 text-small text-warn-700">
          <FileWarning size={18} className="shrink-0 mt-0.5" />
          <div>
            <strong>Avoir</strong> — ce document annule{" "}
            {originalInvoice ? (
              <>
                la facture{" "}
                <Link
                  href={`/invoices/${originalInvoice.id}`}
                  className="font-semibold underline"
                >
                  {originalInvoice.number}
                </Link>
              </>
            ) : (
              "une facture"
            )}
            {" "}(montant : {formatEUR(Math.abs(invoice.amount_cents))}).
          </div>
        </div>
      ) : null}

      {/* Avoirs liés à cette facture */}
      {linkedCreditNotes.length > 0 ? (
        <div className="rounded-2xl bg-surface-2 p-4 space-y-2">
          <div className="text-small font-medium text-ink-700 flex items-center gap-1.5">
            <FileWarning size={14} /> Avoirs liés
          </div>
          {linkedCreditNotes.map((cn) => (
            <Link
              key={cn.id}
              href={`/invoices/${cn.id}`}
              className="flex items-center justify-between rounded-xl px-3 py-2 bg-surface hover:bg-surface-2 transition-colors shadow-hair text-small"
            >
              <span className="font-medium text-ink-900">{cn.number}</span>
              <span className="tabular-nums text-danger-600 font-semibold">
                {formatEUR(cn.amount_cents)}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

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
            className={`mt-1 font-bold tabular-nums tracking-[-0.035em] leading-none ${isCreditNote ? "text-danger-600" : "text-ink-900"}`}
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
          {isCreditNote ? <Field label="Type">Avoir</Field> : null}
        </div>
        <div>
          <div className="text-small text-ink-500 mb-1">Description</div>
          <p className="text-body text-ink-800 whitespace-pre-wrap">{invoice.description}</p>
        </div>

        <InvoiceActions invoice={invoice} canSendEmail={sendEnabled} />
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
          title={`${docLabel} ${invoice.number}`}
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

function StatusDot({ status, isCreditNote }: { status: string; isCreditNote?: boolean }) {
  const map: Record<string, { cls: string; label: string }> = {
    paid:      { cls: "paid",   label: "Payée" },
    sent:      { cls: "sent",   label: "Envoyée" },
    draft:     { cls: "draft",  label: "Brouillon" },
    cancelled: { cls: "cancel", label: "Annulée" },
  };
  const entry = map[status] ?? map.draft;
  const label = isCreditNote ? `Avoir · ${entry.label}` : entry.label;
  return (
    <span className={`status-dot ${entry.cls}`}>
      <span className="d" aria-hidden />
      {label}
    </span>
  );
}
