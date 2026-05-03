import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCreditNote } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/:id/credit-note
 *
 * Crée un avoir (credit note) lié à la facture :id.
 *
 * Body JSON optionnel :
 * - amount_cents : montant de l'avoir (défaut: total de la facture)
 * - reason : motif de l'avoir
 * - createCorrectiveDraft : true pour créer un brouillon correctif (cas 2)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  try {
    const result = await createCreditNote(supabase, user.id, params.id, {
      amount_cents: body.amount_cents != null ? Math.floor(Number(body.amount_cents)) : undefined,
      reason: body.reason,
      createCorrectiveDraft: Boolean(body.createCorrectiveDraft),
    });

    return NextResponse.json({
      creditNoteId: result.creditNote.id,
      creditNoteNumber: result.creditNote.number,
      newDraftId: result.newDraft?.id ?? null,
      newDraftNumber: result.newDraft?.number ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
