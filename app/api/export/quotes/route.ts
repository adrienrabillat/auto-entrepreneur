import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/quotes
 *
 * Export XLSX du carnet de devis : une feuille "Devis" + une feuille
 * "Récap par mois" qui agrège par mois d'émission. Calque la structure
 * de /api/export/xlsx (export factures) pour cohérence visuelle entre
 * les deux fichiers (mêmes en-têtes navy, même filtre auto, même freeze
 * sur la première ligne).
 */

type Quote = {
  id: string;
  number: string;
  description: string;
  quantity: number | string;
  unit_price_cents: number | null;
  amount_cents: number;
  client_name: string | null;
  client_email: string;
  client_siren: string | null;
  client_address: string | null;
  operation_type: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  issued_on: string;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_invoice_id: string | null;
  notes: string | null;
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

function statusLabel(s: Quote["status"], converted: boolean): string {
  if (converted) return "Converti en facture";
  switch (s) {
    case "accepted": return "Accepté";
    case "sent": return "Envoyé";
    case "draft": return "Brouillon";
    case "rejected": return "Refusé";
    case "expired": return "Expiré";
  }
}

function natureLabel(t: string): string {
  if (t === "service") return "Prestation de services";
  if (t === "vente") return "Vente de biens";
  if (t === "mixte") return "Vente + prestation";
  return t;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [{ data: profile }, { data: quotesRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, business_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select("*")
      .eq("user_id", user.id)
      .order("issued_on", { ascending: true }),
  ]);

  const quotes = (quotesRaw ?? []) as Quote[];

  const wb = new ExcelJS.Workbook();
  wb.creator = profile?.display_name ?? "Asthia";
  wb.created = new Date();
  wb.company = profile?.business_name ?? profile?.display_name ?? "Asthia";

  // ─── Sheet 1: Devis ────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet("Devis", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "N° devis", key: "number", width: 14 },
      { header: "Date émission", key: "issued_on", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Validité", key: "valid_until", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Statut", key: "status", width: 18 },
      { header: "Client", key: "client", width: 28 },
      { header: "Email client", key: "client_email", width: 28 },
      { header: "SIREN client", key: "client_siren", width: 14 },
      { header: "Adresse client", key: "client_address", width: 32 },
      { header: "Nature", key: "nature", width: 22 },
      { header: "Description", key: "description", width: 40 },
      { header: "Qté", key: "quantity", width: 8 },
      { header: "PU HT €", key: "unit_price", width: 11, style: { numFmt: "#,##0.00 €" } },
      { header: "Total HT €", key: "total", width: 13, style: { numFmt: "#,##0.00 €" } },
      { header: "Envoyé le", key: "sent_at", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Accepté le", key: "accepted_at", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Refusé le", key: "rejected_at", width: 14, style: { numFmt: "dd/mm/yyyy" } },
      { header: "N° facture liée", key: "converted_invoice_id", width: 18 },
      { header: "Notes internes", key: "notes", width: 36 },
    ];
    styleHeader(ws);

    for (const q of quotes) {
      ws.addRow({
        number: q.number,
        issued_on: parseDate(q.issued_on),
        valid_until: parseDate(q.valid_until),
        status: statusLabel(q.status, Boolean(q.converted_invoice_id)),
        client: q.client_name ?? q.client_email,
        client_email: q.client_email,
        client_siren: q.client_siren ?? "",
        // Aplatie la chaîne multi-ligne client_address (pdf.ts split sur \n)
        // en une seule cellule séparée par " · " pour rester lisible en Excel.
        client_address: (q.client_address ?? "").replace(/\r?\n+/g, " · "),
        nature: natureLabel(q.operation_type),
        description: q.description,
        quantity: Number(q.quantity) || 1,
        unit_price:
          q.unit_price_cents != null
            ? fr(q.unit_price_cents)
            : fr(q.amount_cents) / (Number(q.quantity) || 1),
        total: fr(q.amount_cents),
        sent_at: parseDate(q.sent_at),
        accepted_at: parseDate(q.accepted_at),
        rejected_at: parseDate(q.rejected_at),
        converted_invoice_id: q.converted_invoice_id ?? "",
        notes: q.notes ?? "",
      });
    }

    // Ligne de totaux : on additionne tous les montants pour donner une vue
    // d'ensemble du pipeline commercial. Pas de filtre par statut ici — c'est
    // l'utilisateur qui filtrera dans Excel via l'auto-filter si besoin.
    if (quotes.length) {
      const totalRow = ws.addRow({
        number: "",
        client: "TOTAL",
        total: quotes.reduce((s, q) => s + q.amount_cents, 0) / 100,
      });
      totalRow.font = { bold: true };
      totalRow.getCell("total").numFmt = "#,##0.00 €";
      totalRow.getCell("client").alignment = { horizontal: "right" };
    }

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }

  // ─── Sheet 2: Récap par mois ───────────────────────────────────────────
  // Ventilation : envoyés / acceptés / refusés / expirés. Inclut le taux
  // d'acceptation (accepted / (accepted+rejected+expired)) pour donner une
  // vision pipeline rapide.
  {
    const ws = wb.addWorksheet("Récap", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "Mois", key: "month", width: 22 },
      { header: "Émis HT €", key: "billed", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Acceptés HT €", key: "accepted", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Refusés HT €", key: "rejected", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "En attente HT €", key: "pending", width: 16, style: { numFmt: "#,##0.00 €" } },
      { header: "Nb devis", key: "count", width: 11 },
      { header: "Nb acceptés", key: "count_accepted", width: 13 },
      { header: "Taux accept.", key: "accept_rate", width: 13, style: { numFmt: "0.0%" } },
    ];
    styleHeader(ws);

    type Slot = {
      y: number;
      m: number;
      billed: number;
      accepted: number;
      rejected: number;
      pending: number;
      count: number;
      count_accepted: number;
      count_decided: number;
    };
    const byMonth = new Map<string, Slot>();
    for (const q of quotes) {
      const d = new Date(q.issued_on);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          y, m,
          billed: 0, accepted: 0, rejected: 0, pending: 0,
          count: 0, count_accepted: 0, count_decided: 0,
        });
      }
      const slot = byMonth.get(key)!;
      slot.billed += q.amount_cents;
      slot.count += 1;
      if (q.status === "accepted" || q.converted_invoice_id) {
        slot.accepted += q.amount_cents;
        slot.count_accepted += 1;
        slot.count_decided += 1;
      } else if (q.status === "rejected") {
        slot.rejected += q.amount_cents;
        slot.count_decided += 1;
      } else if (q.status === "expired") {
        // On considère un devis expiré comme un refus implicite côté KPI.
        slot.rejected += q.amount_cents;
        slot.count_decided += 1;
      } else if (q.status === "sent") {
        slot.pending += q.amount_cents;
      }
    }
    const keys = Array.from(byMonth.keys()).sort();
    for (const key of keys) {
      const s = byMonth.get(key)!;
      ws.addRow({
        month: monthLabel(s.y, s.m),
        billed: fr(s.billed),
        accepted: fr(s.accepted),
        rejected: fr(s.rejected),
        pending: fr(s.pending),
        count: s.count,
        count_accepted: s.count_accepted,
        accept_rate: s.count_decided > 0 ? s.count_accepted / s.count_decided : 0,
      });
    }

    if (keys.length) {
      const totals = Array.from(byMonth.values()).reduce(
        (a, s) => ({
          billed: a.billed + s.billed,
          accepted: a.accepted + s.accepted,
          rejected: a.rejected + s.rejected,
          pending: a.pending + s.pending,
          count: a.count + s.count,
          count_accepted: a.count_accepted + s.count_accepted,
          count_decided: a.count_decided + s.count_decided,
        }),
        { billed: 0, accepted: 0, rejected: 0, pending: 0, count: 0, count_accepted: 0, count_decided: 0 },
      );
      const row = ws.addRow({
        month: "TOTAL",
        billed: fr(totals.billed),
        accepted: fr(totals.accepted),
        rejected: fr(totals.rejected),
        pending: fr(totals.pending),
        count: totals.count,
        count_accepted: totals.count_accepted,
        accept_rate: totals.count_decided > 0 ? totals.count_accepted / totals.count_decided : 0,
      });
      row.font = { bold: true };
      row.getCell("month").alignment = { horizontal: "right" };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `devis-${profile?.display_name?.split(" ").join("-").toLowerCase() || "export"}-${today}.xlsx`;
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
