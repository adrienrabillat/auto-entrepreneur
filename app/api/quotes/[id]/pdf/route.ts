import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuotePdfBytes } from "@/lib/quote-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotes/[id]/pdf — renvoie le PDF du devis (génération à la
 * volée, pas de cache). Sert à l'iframe d'aperçu sur la page de détail
 * et au téléchargement direct par le user.
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { bytes, filename } = await generateQuotePdfBytes(supabase, user.id, ctx.params.id);
    // `?download=1` → force le téléchargement plutôt que l'affichage
    // inline (utilisé par le bouton "Télécharger" de la page détail).
    const disposition = req.nextUrl.searchParams.get("download") === "1"
      ? "attachment"
      : "inline";
    return new Response(bytes as unknown as BodyInit, {
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
