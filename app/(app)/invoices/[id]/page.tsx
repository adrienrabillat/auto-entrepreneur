import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/format";
import { InvoiceActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("gmail_refresh_token, gmail_connected_email")
    .eq("id", user!.id)
    .maybeSingle();

  const gmailConnected = Boolean(profile?.gmail_refresh_token);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/invoices" className="text-small text-ink-500 hover:text-ink-800">
          ← Factures
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-small text-ink-500">Facture</div>
            <h1 className="text-h1 tabular-nums">{invoice.number}</h1>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      <div className="surface p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-small">
          <Field label="Client">{invoice.client_name || invoice.client_email}</Field>
          <Field label="Email">{invoice.client_email}</Field>
          <Field label="Émise le">{formatDate(invoice.issued_on)}</Field>
          <Field label="Envoyée le">{invoice.sent_at ? formatDate(invoice.sent_at) : "—"}</Field>
          <Field label="Payée le">{invoice.paid_at ? formatDate(invoice.paid_at) : "—"}</Field>
          <Field label="Montant">
            <span className="text-body font-semibold text-ink-900 tabular-nums">
              {formatEUR(invoice.amount_cents)}
            </span>
          </Field>
        </div>
        <div>
          <div className="text-small text-ink-500 mb-1">Description</div>
          <p className="text-body text-ink-800 whitespace-pre-wrap">{invoice.description}</p>
        </div>

        <InvoiceActions invoice={invoice} gmailConnected={gmailConnected} />
      </div>

      <div className="surface p-0 overflow-hidden">
        <div className="px-4 py-2 text-small text-ink-500 border-b border-ink-200 flex items-center justify-between">
          <span>Aperçu PDF</span>
          <a
            className="text-small text-ink-700 hover:text-ink-900"
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir ↗
          </a>
        </div>
        <iframe
          src={`/api/invoices/${invoice.id}/pdf`}
          title={`Facture ${invoice.number}`}
          className="w-full h-[600px] bg-ink-100"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="text-ink-800">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge tone="success">Payée</Badge>;
  if (status === "sent") return <Badge tone="warn">Envoyée</Badge>;
  if (status === "cancelled") return <Badge tone="danger">Annulée</Badge>;
  return <Badge tone="neutral">Brouillon</Badge>;
}
