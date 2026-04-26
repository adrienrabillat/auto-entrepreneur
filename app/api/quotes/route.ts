import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createQuoteRow, sendQuote } from "@/lib/quote-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/quotes — crée un nouveau devis. Calque /api/invoices avec
 * les différences propres aux devis :
 *   - pas de payment_terms, due_on, prepaid (concepts factures)
 *   - valid_until : date de validité (par défaut +30 jours côté service)
 *   - notes : notes internes pour le vendeur (jamais envoyées au client)
 *
 * Si `send=true` est passé, on envoie le PDF par email immédiatement après
 * création — pratique pour le bouton "Créer et envoyer" du form.
 */
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
  valid_until?: string | null;
  notes?: string | null;
  send?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const description = (body.description ?? "").trim();
  const amount_cents = Math.floor(Number(body.amount_cents));
  const quantity = Number(body.quantity ?? 1);
  const unit_price_cents =
    body.unit_price_cents != null ? Math.floor(Number(body.unit_price_cents)) : null;
  const client_email = (body.client_email ?? "").trim();
  const operation_type: Body["operation_type"] =
    body.operation_type === "vente" || body.operation_type === "mixte"
      ? body.operation_type
      : "service";

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
    const quote = await createQuoteRow(supabase, user.id, {
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
      valid_until: body.valid_until ?? null,
      notes: body.notes ?? null,
    });

    if (body.send) {
      await sendQuote(supabase, user.id, quote.id);
    }
    return NextResponse.json({ id: quote.id, number: quote.number });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
