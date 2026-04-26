import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertQuoteToInvoice } from "@/lib/quote-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/quotes/[id]/convert — transforme un devis accepté en facture.
 *
 * Crée une nouvelle ligne dans `invoices` avec un numéro de facture pris
 * dans la séquence factures (indépendante de celle des devis), puis met
 * à jour le devis avec converted_invoice_id + status = accepted.
 *
 * Idempotent : si le devis a déjà été converti, on renvoie l'ID de la
 * facture existante sans en créer une nouvelle (gère les double-clics).
 */
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const result = await convertQuoteToInvoice(supabase, user.id, ctx.params.id);
    return NextResponse.json({
      invoiceId: result.invoiceId,
      alreadyConverted: result.alreadyConverted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
