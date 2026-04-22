import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInvoice } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    await sendInvoice(supabase, user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
