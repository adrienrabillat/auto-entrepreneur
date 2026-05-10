import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/pdf";
import { loadProfile, pdfDataFromInvoice } from "@/lib/invoice-service";
import { loadLogoForPdf } from "@/lib/logo-loader";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/:id/pdf — returns the invoice as a PDF stream.
 * Regenerated on-the-fly so that profile changes (et le logo) sont
 * toujours reflétés.
 *
 * Query params :
 *  - `?download=1` : Content-Disposition: attachment au lieu d'inline,
 *    pour forcer le téléchargement plutôt que l'affichage navigateur.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
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
    // Logo : chargé pour être embedded dans le PDF (top-left corner).
    const logo = await loadLogoForPdf(supabase, profile.logo_path);
    const pdf = await generateInvoicePdf(
      pdfDataFromInvoice(profile, invoice, relatedNumber, logo),
    );

    const isCreditNote = invoice.invoice_type === "credit_note";
    const filename = isCreditNote
      ? `avoir-${invoice.number}.pdf`
      : `facture-${invoice.number}.pdf`;
    const url = new URL(req.url);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
