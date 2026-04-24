import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/clients
 *
 * Export XLSX du carnet clients complet : une feuille "Clients" avec
 * une ligne par client (Pros et Particuliers confondus), triée par type
 * puis par nom. Inclut un récap en bas (nombre total, répartition).
 */

type ClientRow = {
  id: string;
  is_pro: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  siren: string | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  archived: boolean;
  created_at: string;
};

function composeAddress(c: ClientRow): string {
  const parts = [
    [c.address_line1, c.address_line2].filter(Boolean).join(", ") || null,
    [c.postal_code, c.city].filter(Boolean).join(" ") || null,
    c.country && c.country !== "France" ? c.country : null,
  ].filter(Boolean);
  return parts.join(" — ");
}

function composeName(c: ClientRow): string {
  if (c.is_pro && c.company_name) {
    const who = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return who ? `${c.company_name} — ${who}` : c.company_name;
  }
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [{ data: profile }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, business_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("is_pro", { ascending: false })
      .order("company_name", { ascending: true, nullsFirst: false })
      .order("last_name", { ascending: true, nullsFirst: false }),
  ]);

  const clients = (clientsRaw ?? []) as ClientRow[];

  const wb = new ExcelJS.Workbook();
  wb.creator = profile?.display_name ?? "Asthia";
  wb.created = new Date();
  wb.company = profile?.business_name ?? profile?.display_name ?? "Asthia";

  const ws = wb.addWorksheet("Clients", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "Type",           key: "type",    width: 12 },
    { header: "Nom / Société",  key: "name",    width: 34 },
    { header: "SIREN",          key: "siren",   width: 14 },
    { header: "Email",          key: "email",   width: 28 },
    { header: "Téléphone",      key: "phone",   width: 16 },
    { header: "Adresse",        key: "address", width: 50 },
    { header: "Pays",           key: "country", width: 12 },
    { header: "Notes",          key: "notes",   width: 30 },
    { header: "Archivé",        key: "archived", width: 10 },
    { header: "Créé le",        key: "created", width: 14, style: { numFmt: "dd/mm/yyyy" } },
  ];

  // Style de l'en-tête (navy, texte blanc, hauteur 22)
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  for (const c of clients) {
    ws.addRow({
      type: c.is_pro ? "Pro" : "Particulier",
      name: composeName(c),
      siren: c.siren ?? "",
      email: c.email,
      phone: c.phone ?? "",
      address: composeAddress(c),
      country: c.country,
      notes: c.notes ?? "",
      archived: c.archived ? "Oui" : "Non",
      created: c.created_at ? new Date(c.created_at) : null,
    });
  }

  // Ligne de totaux
  if (clients.length) {
    const countPro = clients.filter((c) => c.is_pro).length;
    const countParticulier = clients.length - countPro;
    const row = ws.addRow({
      type: "TOTAL",
      name: `${clients.length} clients · ${countPro} pros · ${countParticulier} particuliers`,
    });
    row.font = { bold: true };
    row.getCell("name").alignment = { horizontal: "left" };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const safeName = profile?.display_name?.split(" ").join("-").toLowerCase() || "export";
  const filename = `clients-${safeName}-${today}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
