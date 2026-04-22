import { PDFDocument, PDFName, PDFString, PDFHexString, StandardFonts, rgb } from "pdf-lib";
import { buildFacturxMinimumXml } from "@/lib/facturx";

/**
 * Invoice PDF generator.
 *
 * Produces a beautiful, Notion-inspired A4 invoice that is:
 *  - legally compliant for an EI / auto-entrepreneur in France (SIREN + SIRET,
 *    "EI" mention, franchise-en-base TVA notice, nature de l'opération,
 *    mandatory penalty / late-payment clauses, etc.)
 *  - forward-compatible with the "facturation électronique" mandate of
 *    Sept 2026–27: the full Factur-X MINIMUM-profile CII XML is embedded as
 *    an AF (Associated File) relationship "Alternative". A Plateforme Agréée
 *    (PDP) can therefore extract the structured data directly from the PDF.
 *
 * Note: for full PDF/A-3 conformance a downstream PDP will usually re-wrap
 * the document; we output a plain PDF 1.7 with the embedded XML so every
 * PDF reader can still open and print it nicely.
 */

export type OperationType = "service" | "vente" | "mixte";

export type InvoicePdfData = {
  number: string;
  issuedOn: string;              // ISO date (YYYY-MM-DD)
  dueOn?: string;                // optional ISO date
  description: string;
  amountCents: number;
  currency: string;              // "EUR"
  operationType: OperationType;
  deliveryAddress?: string;
  seller: {
    displayName: string;         // "Jeanne Dupont"
    businessName?: string;       // nom commercial (optional)
    legalForm: string;           // "EI"
    metier: string;
    siren: string;               // 9 digits
    siret: string;               // 14 digits
    apeNaf?: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
    city: string;
    country: string;             // "France"
    email: string;
    iban?: string;
    bic?: string;
  };
  client: {
    name?: string;
    email: string;
    siren?: string;              // B2B only
    address?: string;            // free-text, optional
  };
};

// Notion-inspired ink scale. Kept in sync with tailwind.config.ts.
const C_TEXT    = rgb(0.22, 0.21, 0.18);
const C_MUTED   = rgb(0.45, 0.44, 0.42);
const C_HAIR    = rgb(0.86, 0.85, 0.83);
const C_CARD    = rgb(0.97, 0.966, 0.95);
const C_INK     = rgb(0.09, 0.09, 0.09);
const C_ACCENT  = rgb(0.62, 0.42, 0.32); // Notion brown

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${data.number}`);
  pdf.setAuthor(data.seller.displayName);
  pdf.setSubject(`Facture ${data.number} — ${data.seller.displayName}`);
  pdf.setProducer("auto-entrepreneur app");
  pdf.setCreator("auto-entrepreneur app");
  pdf.setCreationDate(new Date());

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();
  const marginX = 56;
  const rightX = width - marginX;

  const text = (
    t: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      font?: typeof regular;
      color?: typeof C_TEXT;
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {}
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const color = opts.color ?? C_TEXT;
    const tw = font.widthOfTextAtSize(t, size);
    let xx = x;
    if (opts.align === "right") xx = x - tw;
    else if (opts.align === "center") xx = x - tw / 2;
    page.drawText(t, { x: xx, y, size, font, color });
    return tw;
  };

  const hr = (y: number, x1 = marginX, x2 = rightX) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color: C_HAIR, thickness: 0.6 });
  };

  let y = height - 60;

  // -----------------------------------------------------------------------
  // Header band
  // -----------------------------------------------------------------------
  text("FACTURE", marginX, y, { size: 11, font: bold, color: C_MUTED });
  text(`N° ${data.number}`, rightX, y, { size: 10, font: regular, color: C_MUTED, align: "right" });

  y -= 24;
  text(
    data.seller.businessName || `${data.seller.displayName}, ${data.seller.legalForm}`,
    marginX,
    y,
    { size: 26, font: bold, color: C_INK }
  );
  text(`émise le ${formatFr(data.issuedOn)}`, rightX, y + 4, { size: 10, color: C_MUTED, align: "right" });
  if (data.dueOn) {
    text(`échéance ${formatFr(data.dueOn)}`, rightX, y - 10, { size: 10, color: C_MUTED, align: "right" });
  }

  y -= 30;
  hr(y);
  y -= 24;

  // -----------------------------------------------------------------------
  // Parties (two-column)
  // -----------------------------------------------------------------------
  const col1X = marginX;
  const col2X = marginX + (rightX - marginX) / 2 + 6;
  const colW = (rightX - marginX) / 2 - 6;

  text("ÉMETTEUR", col1X, y, { size: 9, font: bold, color: C_MUTED });
  text("CLIENT", col2X, y, { size: 9, font: bold, color: C_MUTED });
  y -= 14;

  const sellerLines = [
    { t: `${data.seller.displayName} · ${data.seller.legalForm}`, bold: true },
    data.seller.businessName ? { t: data.seller.businessName, muted: true } : null,
    { t: data.seller.metier },
    { t: data.seller.addressLine1 },
    data.seller.addressLine2 ? { t: data.seller.addressLine2 } : null,
    { t: `${data.seller.postalCode} ${data.seller.city}` },
    data.seller.country && data.seller.country !== "France" ? { t: data.seller.country } : null,
    { t: `SIREN ${formatSiren(data.seller.siren)}`, muted: true },
    { t: `SIRET ${formatSiret(data.seller.siret)}`, muted: true },
    data.seller.apeNaf ? { t: `APE ${data.seller.apeNaf}`, muted: true } : null,
    { t: data.seller.email, muted: true },
  ].filter(Boolean) as { t: string; bold?: boolean; muted?: boolean }[];

  const clientLines = [
    data.client.name ? { t: data.client.name, bold: true } : null,
    data.client.address ? { t: data.client.address } : null,
    data.client.siren ? { t: `SIREN ${formatSiren(data.client.siren)}`, muted: true } : null,
    { t: data.client.email, muted: true },
  ].filter(Boolean) as { t: string; bold?: boolean; muted?: boolean }[];

  const startY = y;
  const LH = 13;
  sellerLines.forEach((line, i) =>
    text(line.t, col1X, startY - i * LH, {
      size: line.bold ? 11 : 10,
      font: line.bold ? bold : regular,
      color: line.muted ? C_MUTED : C_TEXT,
      maxWidth: colW,
    })
  );
  clientLines.forEach((line, i) =>
    text(line.t, col2X, startY - i * LH, {
      size: line.bold ? 11 : 10,
      font: line.bold ? bold : regular,
      color: line.muted ? C_MUTED : C_TEXT,
    })
  );

  y = startY - Math.max(sellerLines.length, clientLines.length) * LH - 22;

  // Operation type chip
  const opLabel =
    data.operationType === "vente"
      ? "Opération : vente de biens"
      : data.operationType === "mixte"
      ? "Opération : vente + prestation de services"
      : "Opération : prestation de services";
  drawChip(page, marginX, y, opLabel, regular);

  if (data.deliveryAddress && data.operationType !== "service") {
    y -= 18;
    text(`Livraison : ${data.deliveryAddress}`, marginX, y, { size: 9, color: C_MUTED });
  }

  y -= 30;
  hr(y);
  y -= 22;

  // -----------------------------------------------------------------------
  // Line items (single line for now)
  // -----------------------------------------------------------------------
  text("Description", marginX, y, { size: 9, font: bold, color: C_MUTED });
  text("Montant", rightX, y, { size: 9, font: bold, color: C_MUTED, align: "right" });
  y -= 12;
  hr(y);
  y -= 20;

  const wrapped = wrap(data.description, 68, regular, 11);
  const rowTop = y;
  wrapped.forEach((line, i) => text(line, marginX, rowTop - i * 14, { size: 11 }));
  text(formatCurrency(data.amountCents, data.currency), rightX, rowTop, {
    size: 11,
    font: bold,
    align: "right",
  });

  y = rowTop - wrapped.length * 14 - 18;
  hr(y);
  y -= 26;

  // -----------------------------------------------------------------------
  // Total block (right-aligned card)
  // -----------------------------------------------------------------------
  const totalBoxW = 220;
  const totalBoxX = rightX - totalBoxW;
  const totalBoxH = 54;
  page.drawRectangle({
    x: totalBoxX,
    y: y - totalBoxH + 8,
    width: totalBoxW,
    height: totalBoxH,
    color: C_CARD,
    borderColor: C_HAIR,
    borderWidth: 0.6,
  });
  text("Total net à payer", totalBoxX + 14, y - 6, { size: 10, color: C_MUTED });
  text("TVA non applicable — art. 293 B du CGI", totalBoxX + 14, y - 18, { size: 8, color: C_MUTED, font: italic });
  text(formatCurrency(data.amountCents, data.currency), totalBoxX + totalBoxW - 14, y - 14, {
    size: 18,
    font: bold,
    color: C_INK,
    align: "right",
  });

  y -= totalBoxH + 24;

  // -----------------------------------------------------------------------
  // Bank details (if provided)
  // -----------------------------------------------------------------------
  if (data.seller.iban) {
    text("Règlement par virement", marginX, y, { size: 9, font: bold, color: C_MUTED });
    y -= 14;
    text(`Bénéficiaire : ${data.seller.displayName}`, marginX, y, { size: 10 });
    y -= 12;
    text(`IBAN ${data.seller.iban}${data.seller.bic ? `   ·   BIC ${data.seller.bic}` : ""}`, marginX, y, {
      size: 10,
    });
    y -= 18;
  }

  // -----------------------------------------------------------------------
  // Legal footer — all French auto-entrepreneur / EI mandatory mentions
  // -----------------------------------------------------------------------
  const legal = [
    "TVA non applicable, art. 293 B du CGI.",
    "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).",
    "Paiement à réception, sauf mention contraire. En cas de retard : indemnité forfaitaire de 40 € pour frais",
    "de recouvrement (art. L441-10 du Code de commerce) et pénalités de retard au taux de la BCE majoré de 10 points.",
    "Pas d'escompte pour paiement anticipé.",
    `Mention « ${data.seller.legalForm} » apposée conformément à l'article L526-22 du Code de commerce.`,
  ];

  // Draw legal band at bottom of page
  const footerY = 84;
  hr(footerY + legal.length * 11 + 6);
  legal.forEach((line, i) =>
    text(line, marginX, footerY + (legal.length - 1 - i) * 11, { size: 8.5, color: C_MUTED })
  );

  // Page footer — contact line
  text(
    `${data.seller.displayName} · ${data.seller.email} · SIREN ${formatSiren(data.seller.siren)}`,
    width / 2,
    48,
    { size: 8, color: C_MUTED, align: "center" }
  );
  text(`1 / 1`, rightX, 48, { size: 8, color: C_MUTED, align: "right" });

  // -----------------------------------------------------------------------
  // Embed Factur-X MINIMUM XML as an associated file (AFRelationship=Alternative).
  // -----------------------------------------------------------------------
  const xml = buildFacturxMinimumXml({
    number: data.number,
    issuedOnIso: data.issuedOn,
    currency: data.currency,
    totalCents: data.amountCents,
    seller: {
      legalName: `${data.seller.displayName}${data.seller.legalForm ? `, ${data.seller.legalForm}` : ""}`,
      siren: data.seller.siren,
      addressLine1: data.seller.addressLine1,
      postalCode: data.seller.postalCode,
      city: data.seller.city,
      countryCode: "FR",
    },
    buyer: {
      name: data.client.name || data.client.email,
      siren: data.client.siren,
    },
  });

  await embedFacturxXml(pdf, xml);

  return await pdf.save();
}

function drawChip(page: import("pdf-lib").PDFPage, x: number, y: number, label: string, font: import("pdf-lib").PDFFont) {
  const padX = 8;
  const h = 18;
  const size = 9;
  const w = font.widthOfTextAtSize(label, size) + padX * 2;
  page.drawRectangle({ x, y: y - 4, width: w, height: h, color: C_CARD, borderColor: C_HAIR, borderWidth: 0.6 });
  page.drawText(label, { x: x + padX, y: y + 1, size, font, color: C_MUTED });
}

// ---------------------------------------------------------------------------
// Factur-X attachment — AFRelationship "Alternative" is the spec-compliant
// relationship for the primary structured data of the invoice.
// ---------------------------------------------------------------------------
async function embedFacturxXml(pdf: PDFDocument, xml: string) {
  const xmlBytes = new TextEncoder().encode(xml);
  await pdf.attach(xmlBytes, "factur-x.xml", {
    mimeType: "application/xml",
    description: "Factur-X (MINIMUM profile) — données structurées de la facture",
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // Mark the attachment as AFRelationship=Alternative and reference it via
  // the document-level /AF array. This is what Factur-X readers look for to
  // distinguish the structured invoice from arbitrary attachments.
  const root = pdf.catalog;
  const names = root.lookup(PDFName.of("Names"));
  // names -> EmbeddedFiles -> Names [ "factur-x.xml", filespec ]
  // We need to patch that filespec to add AFRelationship + add it to /AF.
  type NamesDict = { lookup(n: PDFName): unknown };
  const ef = (names as NamesDict | undefined)?.lookup?.(PDFName.of("EmbeddedFiles"));
  type EFDict = {
    lookup(n: PDFName): { size?(): number; get?(i: number): unknown } | undefined;
  };
  const arr = (ef as EFDict | undefined)?.lookup?.(PDFName.of("Names"));
  const size = typeof arr?.size === "function" ? arr.size() : 0;
  for (let i = 1; i < size; i += 2) {
    const spec = arr?.get?.(i) as { set?(n: PDFName, v: unknown): void } | undefined;
    if (spec && typeof spec.set === "function") {
      spec.set(PDFName.of("AFRelationship"), PDFName.of("Alternative"));
      // Also tag it with Factur-X specific Desc & Subtype
      spec.set(PDFName.of("Desc"), PDFString.of("Factur-X XML"));
      // Add to /AF array on catalog
      const afArr = pdf.context.obj([spec]);
      root.set(PDFName.of("AF"), afArr);
    }
  }
  // Mark conformance hint in metadata (non-standard but useful to humans)
  pdf.setKeywords(["Factur-X", "MINIMUM", "EN16931", "CII", "auto-entrepreneur"]);
  // Unused var guard
  void PDFHexString;
}

function wrap(text: string, maxChars: number, _font: unknown, _size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function formatFr(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
}

function formatSiren(s: string) {
  const d = (s || "").replace(/\D/g, "");
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}` : s;
}

function formatSiret(s: string) {
  const d = (s || "").replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9, 14)}` : s;
}
