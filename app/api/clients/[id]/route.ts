import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Body = {
  is_pro?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  siren?: string | null;
  email?: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string;
  notes?: string | null;
};

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = (body.email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  const siren = (body.siren ?? "").replace(/\s/g, "");
  if (siren && !/^\d{9}$/.test(siren)) {
    return NextResponse.json({ error: "SIREN : 9 chiffres attendus" }, { status: 400 });
  }

  const { error } = await supabase
    .from("clients")
    .update({
      is_pro: Boolean(body.is_pro),
      first_name: emptyToNull(body.first_name),
      last_name: emptyToNull(body.last_name),
      company_name: emptyToNull(body.company_name),
      siren: siren || null,
      email,
      phone: emptyToNull(body.phone),
      address_line1: emptyToNull(body.address_line1),
      address_line2: emptyToNull(body.address_line2),
      postal_code: emptyToNull(body.postal_code),
      city: emptyToNull(body.city),
      country: body.country || "France",
      notes: emptyToNull(body.notes),
    })
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.toString().trim();
  return t.length ? t : null;
}
