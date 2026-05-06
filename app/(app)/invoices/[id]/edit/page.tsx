import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { ArrowLeft } from "lucide-react";
import { EditInvoiceForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, number, description, quantity, unit_price_cents, amount_cents, operation_type, execution_date, delivery_address, due_on, discount_terms, status, client_name, client_email, invoice_type")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!invoice) notFound();

  // Seuls les brouillons standard sont modifiables.
  // Les avoirs (même en draft) sont figés : leur numéro légal a déjà été
  // attribué, les modifier ou supprimer créerait un trou dans la séquence
  // chronologique URSSAF (illégal).
  if (invoice.status !== "draft" || invoice.invoice_type === "credit_note") {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Link
        href={`/invoices/${invoice.id}`}
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft size={14} /> Retour à la facture
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Modifier le brouillon</span>
      </h1>
      <p className="mt-1 text-small text-ink-500">
        {invoice.number} · {invoice.client_name || invoice.client_email}
      </p>

      <div className="mt-6">
        <EditInvoiceForm invoice={invoice} />
      </div>
    </div>
  );
}
