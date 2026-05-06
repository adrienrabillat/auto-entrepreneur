import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeInvoiceNumber } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const paid: boolean = body?.paid ?? true;
  const paidOn: string | null = body?.paid_on ?? null;

  // Si on marque comme payée ET que la facture a encore un numéro brouillon,
  // on finalise le numéro séquentiel d'abord.
  // Garde additionnelle : on refuse de toucher au statut d'un avoir — le
  // statut "paid" d'un avoir est posé à la création pour qu'il soit inclus
  // dans la déclaration URSSAF du mois courant (avec montant négatif). Le
  // user ne doit pas pouvoir le toggle.
  if (paid) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("number, invoice_type, imported")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (inv?.imported) {
      return NextResponse.json(
        { error: "Le statut d'une facture importée est figé." },
        { status: 400 }
      );
    }
    if (inv?.invoice_type === "credit_note") {
      return NextResponse.json(
        { error: "Le statut d'un avoir est figé." },
        { status: 400 }
      );
    }
    if (inv?.number?.startsWith("BROUILLON-")) {
      await finalizeInvoiceNumber(supabase, user.id, params.id);
    }
  } else {
    // Garde aussi sur le "retirer le paiement"
    const { data: inv } = await supabase
      .from("invoices")
      .select("invoice_type, imported")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();
    if (inv?.imported) {
      return NextResponse.json(
        { error: "Le statut d'une facture importée est figé." },
        { status: 400 }
      );
    }
    if (inv?.invoice_type === "credit_note") {
      return NextResponse.json(
        { error: "Le statut d'un avoir est figé." },
        { status: 400 }
      );
    }
  }

  const updates = paid
    ? { status: "paid" as const, paid_at: paidOn ? new Date(paidOn).toISOString() : new Date().toISOString() }
    : { status: "sent" as const, paid_at: null };

  const { error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
