import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInvoiceRow, sendInvoice } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

type Body = {
  description?: string;
  amount_cents?: number;
  client_email?: string;
  client_name?: string | null;
  client_siren?: string | null;
  client_address?: string | null;
  operation_type?: "service" | "vente" | "mixte";
  delivery_address?: string | null;
  send?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const description = (body.description ?? "").trim();
  const amount_cents = Math.floor(Number(body.amount_cents));
  const client_email = (body.client_email ?? "").trim();
  const operation_type: Body["operation_type"] =
    body.operation_type === "vente" || body.operation_type === "mixte" ? body.operation_type : "service";

  if (!description) return NextResponse.json({ error: "Description requise" }, { status: 400 });
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
      amount_cents,
      client_email,
      client_name: body.client_name ?? null,
      client_siren: cleanSiren || null,
      client_address: body.client_address ?? null,
      operation_type,
      delivery_address: body.delivery_address ?? null,
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
