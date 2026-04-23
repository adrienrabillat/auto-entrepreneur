import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/invoices/:id
 *
 * Only deletes invoices that are still in `draft` status. Anything that was
 * already sent or paid is intentionally kept for audit / legal reasons —
 * you don't just lose a paid invoice by accident.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Fetch to check status
  const { data: invoice, error: getErr } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  if (invoice.status !== "draft") {
    return NextResponse.json(
      {
        error:
          "Seuls les brouillons peuvent être supprimés. Une facture envoyée ou payée doit être gardée pour des raisons légales.",
      },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabase
    .from("invoices")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
