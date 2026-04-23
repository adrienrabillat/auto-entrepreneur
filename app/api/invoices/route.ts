import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInvoiceRow, sendInvoice } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

type Body = {
  description?: string;
  quantity?: number;
  unit_price_cents?: number;
  amount_cents?: number;
  client_id?: string | null;
  client_email?: string;
  client_name?: string | null;
  client_siren?: string | null;
  client_address?: string | null;
  operation_type?: "service" | "vente" | "mixte";
  delivery_address?: string | null;
  execution_date?: string | null;
  due_on?: string | null;
  payment_terms?: string | null;
  discount_terms?: string | null;
  send?: boolean;
  /** true = facture acquittée (paiement déjà reçu avant émission) */
  prepaid?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const description = (body.description ?? "").trim();
  const amount_cents = Math.floor(Number(body.amount_cents));
  const quantity = Number(body.quantity ?? 1);
  const unit_price_cents = body.unit_price_cents != null ? Math.floor(Number(body.unit_price_cents)) : null;
  const client_email = (body.client_email ?? "").trim();
  const operation_type: Body["operation_type"] =
    body.operation_type === "vente" || body.operation_type === "mixte" ? body.operation_type : "service";

  if (!description) return NextResponse.json({ error: "Description requise" }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
  }
  if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client_email)) {
    return NextResponse.json({ error: "Email du client invalide" }, { status: 400 });
  }
  const cleanSiren = (body.client_siren ?? "").replace(/\s/g, "");
  if (cleanSiren && !/^\d{9}$/.test(cleanSiren)) {
    return NextResponse.json({ error: "SIREN client : 9 chiffres attendus" }, { status: 400 });
  }

  try {
    const invoice = await createInvoiceRow(supabase, user.id, {
      description,
      quantity,
      unit_price_cents,
      amount_cents,
      client_id: body.client_id ?? null,
      client_email,
      client_name: body.client_name ?? null,
      client_siren: cleanSiren || null,
      client_address: body.client_address ?? null,
      operation_type,
      delivery_address: body.delivery_address ?? null,
      execution_date: body.execution_date ?? null,
      due_on: body.due_on ?? null,
      payment_terms: body.payment_terms ?? null,
      discount_terms: body.discount_terms ?? "Néant",
      prepaid: Boolean(body.prepaid),
    });

    if (body.send) {
      await sendInvoice(supabase, user.id, invoice.id);
    }
    return NextResponse.json({ id: invoice.id, number: invoice.number });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
