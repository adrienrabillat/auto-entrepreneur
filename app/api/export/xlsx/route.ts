import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Parse et valide le paramètre ?year=YYYY.
 * Retourne null pour "toutes années" (défaut historique conservé), ou le
 * numéro d'année validé. Refuse les valeurs absurdes (< 2000 ou > current+1).
 */
function parseYearParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  const currentYear = new Date().getFullYear();
  if (n < 2000 || n > currentYear + 1) return null;
  return n;
}

type Invoice = {
  id: string;
  number: string;
  description: string;
  quantity: number | string;
  unit_price_cents: number | null;
  amount_cents: number;
  client_name: string | null;
  client_email: string;
  client_siren: string | null;
  operation_type: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  issued_on: string;
  sent_at: string | null;
  paid_at: string | null;
  due_on: string | null;
  execution_date: string | null;
  invoice_type?: string;
  related_invoice_id?: string | null;
  imported?: boolean;
  import_source?: string | null;
};

type Declaration = {
  period_year: number;
  period_month: number;
  total_cents: number;
  status: string;
  urssaf_reference: string | null;
  submitted_at: string | null;
};

function fr(cents: number): number {
  return cents / 100;
}

function monthLabel(y: number, m: number): string {
  const names = [
    "janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre",
  ];
  return `${names[m - 1]} ${y}`;
}

function statusLabel(s: Invoice["status"]): string {
  switch (s) {
    case "paid": return "Payée";
    case "sent": return "Envoyée";
    case "draft": return "Brouillon";
    case "cancelled": return "Annulée";
  }
}

function natureLabel(t: string): string {
  if (t === "service") return "Prestation de services";
  if (t === "vente") return "Vente de biens";
  if (t === "mixte") return "Vente + prestation";
  return t;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // ?year=YYYY : filtre par exercice fiscal (= année civile pour les
  // micro-entrepreneurs). Si absent ou invalide, on exporte tout l'historique
  // — comportement rétro-compat avec l'ancienne API.
  const year = parseYearParam(req.nextUrl.searchParams.get("year"));

  // Bornes pour le filtre invoice.issued_on : [year-01-01, (year+1)-01-01).
  // On filtre côté serveur via gte/lt pour éviter de rapatrier toute la BDD
  // si l'AE a plusieurs années d'historique.
  const yearStart = year ? `${year}-01-01` : null;
  const yearEnd = year ? `${year + 1}-01-01` : null;

  let invoicesQuery = supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("issued_on", { ascending: true });
  if (yearStart && yearEnd) {
    invoicesQuery = invoicesQuery.gte("issued_on", yearStart).lt("issued_on", yearEnd);
  }

  let declsQuery = supabase
    .from("monthly_declarations")
    .select("period_year, period_month, total_cents, status, urssaf_reference, submitted_at")
    .eq("user_id", user.id)
    .order("period_year", { ascending: true })
    .order("period_month", { ascending: true });
  if (year) {
    declsQuery = declsQuery.eq("period_year", year);
  }

  const [{ data: profile }, { data: invoicesRaw }, { data: declsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, business_name, siren, siret, metier, email")
      .eq("id", user.id)
      .maybeSingle(),
    invoicesQuery,
    declsQuery,
  ]);

  const invoices = (invoicesRaw ?? []) as Invoice[];
  const declarations = (declsRaw ?? []) as Declaration[];

  const wb = new ExcelJS.Workbook();
  wb.creator = profile?.display_name ?? "Asthia";
  wb.created = new Date();
  wb.company = profile?.business_name ?? profile?.display_name ?? "Asthia";

  // ─── Sheet 1: Factures ─────────────────────────────────────────────────
  {
    const sheetName = year ? `Factures ${year}` : "Factures";
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "N° facture", key: "number", width: 14 },
      // Type : "Facture" / "Avoir" — colonne ajoutée Sprint 4 pour rendre
      // les avoirs explicites côté compta (sinon c'est juste un montant
      // négatif sans contexte dans la liste).
      { header: "Type", key: "type", width: 10 },
      { header: "Date émission", key: "issued_on", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Date exécution", key: "execution_date", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Statut", key: "status", width: 11 },
      { header: "Client", key: "client", width: 28 },
      { header: "Email client", key: "client_email", width: 28 },
      { header: "SIREN client", key: "client_siren", width: 14 },
      { header: "Nature", key: "nature", width: 22 },
      { header: "Description", key: "description", width: 40 },
      { header: "Qté", key: "quantity", width: 8 },
      { header: "PU HT €", key: "unit_price", width: 11, style: { numFmt: "#,##0.00 €" } },
      { header: "Total HT €", key: "total", width: 13, style: { numFmt: "#,##0.00 €" } },
      { header: "Envoyée le", key: "sent_at", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Payée le", key: "paid_at", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Échéance", key: "due_on", width: 14, style: { numFmt: "dd/mm/yyyy" } },
    ];
    styleHeader(ws);

    for (const inv of invoices) {
      // Type composite : combine "Avoir / Facture" et le marqueur "Importée"
      // pour que les comptables identifient en un coup d'œil les factures
      // historiques (qui ne sont pas dans la séquence légale Asthia).
      const baseType = inv.invoice_type === "credit_note" ? "Avoir" : "Facture";
      const typeLabel = inv.imported ? `${baseType} (importée)` : baseType;
      ws.addRow({
        number: inv.number,
        type: typeLabel,
        issued_on: parseDate(inv.issued_on),
        execution_date: parseDate(inv.execution_date),
        status: statusLabel(inv.status),
        client: inv.client_name ?? inv.client_email,
        client_email: inv.client_email,
        client_siren: inv.client_siren ?? "",
        nature: natureLabel(inv.operation_type),
        description: inv.description,
        quantity: Number(inv.quantity) || 1,
        unit_price: inv.unit_price_cents != null ? fr(inv.unit_price_cents) : fr(inv.amount_cents) / (Number(inv.quantity) || 1),
        total: fr(inv.amount_cents),
        sent_at: parseDate(inv.sent_at),
        paid_at: parseDate(inv.paid_at),
        due_on: parseDate(inv.due_on),
      });
    }

    // Ligne de totaux
    if (invoices.length) {
      const totalRow = ws.addRow({
        number: "",
        client: "TOTAL",
        total: invoices.reduce((s, i) => s + i.amount_cents, 0) / 100,
      });
      totalRow.font = { bold: true };
      totalRow.getCell("total").numFmt = "#,##0.00 €";
      totalRow.getCell("client").alignment = { horizontal: "right" };
    }

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }

  // ─── Sheet 2: Déclarations URSSAF ─────────────────────────────────────
  {
    const ws = wb.addWorksheet("URSSAF", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "Période", key: "period", width: 22 },
      { header: "CA encaissé €", key: "total", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Statut", key: "status", width: 14 },
      { header: "Référence URSSAF", key: "ref", width: 28 },
      { header: "Envoyée le", key: "submitted_at", width: 16, style: { numFmt: "dd/mm/yyyy" } },
    ];
    styleHeader(ws);

    for (const d of declarations) {
      ws.addRow({
        period: monthLabel(d.period_year, d.period_month),
        total: fr(d.total_cents),
        status: d.status,
        ref: d.urssaf_reference ?? "",
        submitted_at: parseDate(d.submitted_at),
      });
    }

    if (declarations.length) {
      const totalRow = ws.addRow({
        period: "TOTAL déclaré",
        total: declarations.reduce((s, d) => s + d.total_cents, 0) / 100,
      });
      totalRow.font = { bold: true };
      totalRow.getCell("period").alignment = { horizontal: "right" };
      totalRow.getCell("total").numFmt = "#,##0.00 €";
    }
  }

  // ─── Sheet 3: Récap par mois ───────────────────────────────────────────
  {
    const ws = wb.addWorksheet("Récap", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "Mois", key: "month", width: 22 },
      { header: "Facturé HT €", key: "billed", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Encaissé €", key: "collected", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "En attente €", key: "outstanding", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Nb factures", key: "count", width: 12 },
    ];
    styleHeader(ws);

    // Aggrège par mois d'émission.
    const byMonth = new Map<string, { y: number; m: number; billed: number; collected: number; outstanding: number; count: number }>();
    for (const inv of invoices) {
      const d = new Date(inv.issued_on);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      if (!byMonth.has(key)) byMonth.set(key, { y, m, billed: 0, collected: 0, outstanding: 0, count: 0 });
      const slot = byMonth.get(key)!;
      slot.billed += inv.amount_cents;
      slot.count += 1;
      if (inv.paid_at) slot.collected += inv.amount_cents;
      else if (inv.status === "sent") slot.outstanding += inv.amount_cents;
    }
    const keys = Array.from(byMonth.keys()).sort();
    for (const key of keys) {
      const s = byMonth.get(key)!;
      ws.addRow({
        month: monthLabel(s.y, s.m),
        billed: fr(s.billed),
        collected: fr(s.collected),
        outstanding: fr(s.outstanding),
        count: s.count,
      });
    }

    // Totaux
    if (keys.length) {
      const totals = Array.from(byMonth.values()).reduce(
        (a, s) => ({
          billed: a.billed + s.billed,
          collected: a.collected + s.collected,
          outstanding: a.outstanding + s.outstanding,
          count: a.count + s.count,
        }),
        { billed: 0, collected: 0, outstanding: 0, count: 0 }
      );
      const row = ws.addRow({
        month: "TOTAL",
        billed: fr(totals.billed),
        collected: fr(totals.collected),
        outstanding: fr(totals.outstanding),
        count: totals.count,
      });
      row.font = { bold: true };
      row.getCell("month").alignment = { horizontal: "right" };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const slug = profile?.display_name?.split(" ").join("-").toLowerCase() || "export";
  // Filename : "compta-<user>-<year>.xlsx" ou "compta-<user>-<today>.xlsx"
  // selon qu'on a filtré ou pas.
  const filename = year
    ? `compta-${slug}-${year}.xlsx`
    : `compta-${slug}-${today}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // navy brand
  };
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 22;
}
