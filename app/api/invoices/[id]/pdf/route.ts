import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/pdf";
import { loadProfile, pdfDataFromInvoice } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/:id/pdf — returns the invoice as a PDF stream.
 * Regenerated on-the-fly so that profile changes are always reflected.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (error || !invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  // Pour un avoir, charger le numéro de la facture originale afin de
  // l'afficher dans le PDF ("Avoir relatif à la facture F-2026-0042").
  let relatedNumber: string | undefined;
  if (invoice.invoice_type === "credit_note" && invoice.related_invoice_id) {
    const { data: original } = await supabase
      .from("invoices")
      .select("number")
      .eq("id", invoice.related_invoice_id)
      .eq("user_id", user.id)
      .maybeSingle();
    relatedNumber = original?.number;
  }

  try {
    const profile = await loadProfile(supabase, user.id);
    const pdf = await generateInvoicePdf(pdfDataFromInvoice(profile, invoice, relatedNumber));
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${invoice.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
