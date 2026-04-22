import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const paid: boolean = body?.paid ?? true;
  const paidOn: string | null = body?.paid_on ?? null;

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
