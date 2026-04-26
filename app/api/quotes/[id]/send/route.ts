import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendQuote } from "@/lib/quote-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/quotes/[id]/send — envoie le devis par email au client.
 * Génère le PDF, l'upload dans Storage, envoie via Gmail (FACTURX
 * désactivé pour les devis) et bascule le statut draft → sent.
 *
 * Idempotent : ré-envoyer un devis déjà sent met à jour sent_at sans
 * changer le statut, ce qui est utile en cas de réémission ou correction.
 */
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    await sendQuote(supabase, user.id, ctx.params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
