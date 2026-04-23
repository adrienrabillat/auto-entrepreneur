import { PDFDocument, PDFName, PDFString, PDFHexString, StandardFonts, rgb } from "pdf-lib";
import { buildFacturxMinimumXml } from "@/lib/facturx";

/**
 * Invoice PDF generator — modern, vibrant layout.
 *
 * Produces an A4 invoice that is:
 *  - Visually modern (inspired by Qonto / Pennylane / Stripe invoices) with a
 *    brand-colored hero band, a clean parties block, a full-width total strip
 *    and minimal legal footer.
 *  - Legally compliant for an EI / auto-entrepreneur in France (SIREN + SIRET,
 *    "EI" mention, franchise-en-base TVA notice, nature de l'opération,
 *    mandatory penalty / late-payment clauses, etc.)
 *  - Forward-compatible with the "facturation électronique" mandate of
 *    Sept 2026–27: the full Factur-X MINIMUM-profile CII XML is embedded as
 *    an AF (Associated File) relationship "Alternative". A Plateforme Agréée
 *    (PDP) can therefore extract the structured data directly from the PDF.
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

// Modern brand palette — mirrors tailwind.config.ts
const C_BRAND       = rgb(0.357, 0.278, 1);     // #5B47FF
const C_BRAND_DARK  = rgb(0.216, 0.169, 0.698); // #372BB2
const C_PINK        = rgb(1.000, 0.416, 0.835); // #FF6AD5
const C_INK         = rgb(0.059, 0.090, 0.165); // #0F172A
const C_INK_800     = rgb(0.118, 0.161, 0.231); // #1E293B
const C_INK_600     = rgb(0.278, 0.333, 0.412); // #475569
const C_MUTED       = rgb(0.392, 0.455, 0.545); // #64748B
const C_SOFT        = rgb(0.580, 0.639, 0.722); // #94A3B8
const C_LINE        = rgb(0.882, 0.910, 0.941); // #E2E8F0
const C_SURFACE     = rgb(0.972, 0.980, 0.988); // near ink-50
const C_TINT        = rgb(0.933, 0.937, 1.000); // #EEF0FF brand-tint
const C_TINT_PINK   = rgb(0.988, 0.910, 0.965); // #FCE8F6
const C_WHITE       = rgb(1, 1, 1);

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
  const marginX = 48;
  const rightX = width - marginX;
  const innerW = rightX - marginX;

  const text = (
    t: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      font?: typeof regular;
      color?: typeof C_INK;
      align?: "left" | "right" | "center";
    } = {}
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const color = opts.color ?? C_INK;
    const tw = font.widthOfTextAtSize(t, size);
    let xx = x;
    if (opts.align === "right") xx = x - tw;
    else if (opts.align === "center") xx = x - tw / 2;
    page.drawText(t, { x: xx, y, size, font, color });
    return tw;
  };

  // -----------------------------------------------------------------------
  // HERO — vibrant brand band with rounded bottom-corners fake via a second
  // lighter rectangle. pdf-lib has no native gradient so we use a stacked
  // two-color bar (brand + pink accent strip) to feel vibrant and modern.
  // -----------------------------------------------------------------------
  const heroH = 150;
  const heroY = height - heroH;

  page.drawRectangle({ x: 0, y: heroY, width, height: heroH, color: C_BRAND });
  // Accent diagonal-ish pink stripe (a tall rectangle on the right)
  page.drawRectangle({
    x: width - 140,
    y: heroY - 10,
    width: 140,
    height: heroH + 10,
    color: C_PINK,
    opacity: 0.25,
  });
  // Deeper brand slash near left for a bit of depth
  page.drawRectangle({
    x: -30,
    y: heroY - 20,
    width: 220,
    height: heroH + 20,
    color: C_BRAND_DARK,
    opacity: 0.35,
  });

  // Top-left: label + business name
  text("FACTURE", marginX, height - 44, { size: 11, font: bold, color: C_WHITE });
  const nameLine = data.seller.businessName || data.seller.displayName;
  text(nameLine, marginX, height - 78, {
    size: 26,
    font: bold,
    color: C_WHITE,
  });
  const subtitle = data.seller.businessName
    ? `${data.seller.displayName} · ${data.seller.legalForm}`
    : data.seller.legalForm;
  text(subtitle, marginX, height - 96, { size: 10, color: C_WHITE, font: regular });
  if (data.seller.metier) {
    text(data.seller.metier, marginX, height - 112, {
      size: 9,
      color: C_WHITE,
      font: italic,
    });
  }

  // Top-right: N° + date + amount teaser
  text(`N° ${data.number}`, rightX, height - 44, {
    size: 10,
    font: bold,
    color: C_WHITE,
    align: "right",
  });
  text(`Émise le ${formatFr(data.issuedOn)}`, rightX, height - 60, {
    size: 9,
    color: C_WHITE,
    align: "right",
  });
  if (data.dueOn) {
    text(`Échéance ${formatFr(data.dueOn)}`, rightX, height - 74, {
      size: 9,
      color: C_WHITE,
      align: "right",
    });
  }
  // Total chip in hero
  text("TOTAL À PAYER", rightX, height - 100, {
    size: 8,
    font: bold,
    color: C_WHITE,
    align: "right",
  });
  text(formatCurrency(data.amountCents, data.currency), rightX, height - 124, {
    size: 22,
    font: bold,
    color: C_WHITE,
    align: "right",
  });

  // -----------------------------------------------------------------------
  // Parties cards — Émetteur (tinted) + Client (white ring)
  // -----------------------------------------------------------------------
  let y = heroY - 28;
  const gap = 14;
  const colW = (innerW - gap) / 2;

  // Émetteur card (brand tint)
  const cardH = cardHeightSeller(data);
  page.drawRectangle({
    x: marginX,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: C_TINT,
    borderColor: C_TINT,
    borderWidth: 0,
  });
  drawLeftBorder(page, marginX, y - cardH, cardH, C_BRAND);
  text("ÉMETTEUR", marginX + 14, y - 18, { size: 8, font: bold, color: C_BRAND });
  text(`${data.seller.displayName} · ${data.seller.legalForm}`, marginX + 14, y - 34, {
    size: 11,
    font: bold,
    color: C_INK,
  });
  let sy = y - 50;
  const sellerInfoLines = [
    data.seller.addressLine1,
    data.seller.addressLine2 || null,
    `${data.seller.postalCode} ${data.seller.city}`,
    data.seller.country && data.seller.country !== "France" ? data.seller.country : null,
    data.seller.email,
  ].filter(Boolean) as string[];
  sellerInfoLines.forEach((line) => {
    text(line, marginX + 14, sy, { size: 9.5, color: C_INK_600 });
    sy -= 12;
  });
  sy -= 4;
  text(`SIREN ${formatSiren(data.seller.siren)}`, marginX + 14, sy, {
    size: 9,
    color: C_MUTED,
  });
  sy -= 11;
  text(`SIRET ${formatSiret(data.seller.siret)}`, marginX + 14, sy, {
    size: 9,
    color: C_MUTED,
  });
  if (data.seller.apeNaf) {
    sy -= 11;
    text(`APE ${data.seller.apeNaf}`, marginX + 14, sy, { size: 9, color: C_MUTED });
  }

  // Client card (white ring)
  const clientX = marginX + colW + gap;
  page.drawRectangle({
    x: clientX,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: C_WHITE,
    borderColor: C_LINE,
    borderWidth: 0.8,
  });
  drawLeftBorder(page, clientX, y - cardH, cardH, C_PINK);
  text("FACTURÉ À", clientX + 14, y - 18, { size: 8, font: bold, color: C_PINK });
  const clientHeader = data.client.name || data.client.email;
  text(clientHeader, clientX + 14, y - 34, { size: 11, font: bold, color: C_INK });
  let cy = y - 50;
  if (data.client.address) {
    data.client.address.split(/\r?\n/).forEach((line) => {
      text(line, clientX + 14, cy, { size: 9.5, color: C_INK_600 });
      cy -= 12;
    });
  }
  if (data.client.name) {
    text(data.client.email, clientX + 14, cy, { size: 9.5, color: C_MUTED });
    cy -= 12;
  }
  if (data.client.siren) {
    cy -= 2;
    text(`SIREN ${formatSiren(data.client.siren)}`, clientX + 14, cy, {
      size: 9,
      color: C_MUTED,
    });
  }

  y -= cardH + 26;

  // -----------------------------------------------------------------------
  // Meta row — operation type + delivery
  // -----------------------------------------------------------------------
  const opLabel =
    data.operationType === "vente"
      ? "Vente de biens"
      : data.operationType === "mixte"
      ? "Vente + prestation de services"
      : "Prestation de services";
  drawPill(page, marginX, y - 2, "Nature", opLabel, regular, bold);

  if (data.deliveryAddress && data.operationType !== "service") {
    text(`Livraison : ${data.deliveryAddress}`, rightX, y + 2, {
      size: 9,
      color: C_MUTED,
      align: "right",
    });
  }

  y -= 32;

  // -----------------------------------------------------------------------
  // Line items — modern table
  // -----------------------------------------------------------------------
  // Header bar
  const tableHeaderH = 28;
  page.drawRectangle({
    x: marginX,
    y: y - tableHeaderH,
    width: innerW,
    height: tableHeaderH,
    color: C_INK,
  });
  text("DESCRIPTION", marginX + 16, y - 18, {
    size: 9,
    font: bold,
    color: C_WHITE,
  });
  text("MONTANT", rightX - 16, y - 18, {
    size: 9,
    font: bold,
    color: C_WHITE,
    align: "right",
  });

  y -= tableHeaderH;

  // Body
  const wrapped = wrap(data.description, 62);
  const rowH = Math.max(40, wrapped.length * 14 + 20);
  page.drawRectangle({
    x: marginX,
    y: y - rowH,
    width: innerW,
    height: rowH,
    color: C_WHITE,
    borderColor: C_LINE,
    borderWidth: 0.8,
  });
  wrapped.forEach((line, i) => {
    text(line, marginX + 16, y - 18 - i * 14, {
      size: 11,
      color: C_INK_800,
      font: regular,
    });
  });
  text(formatCurrency(data.amountCents, data.currency), rightX - 16, y - 22, {
    size: 12,
    font: bold,
    color: C_INK,
    align: "right",
  });

  y -= rowH + 18;

  // -----------------------------------------------------------------------
  // Grand total bar — full width, brand colored
  // -----------------------------------------------------------------------
  const totalH = 62;
  page.drawRectangle({
    x: marginX,
    y: y - totalH,
    width: innerW,
    height: totalH,
    color: C_BRAND,
  });
  // subtle pink accent on right edge
  page.drawRectangle({
    x: rightX - 90,
    y: y - totalH,
    width: 90,
    height: totalH,
    color: C_PINK,
    opacity: 0.22,
  });
  text("TOTAL NET À PAYER", marginX + 18, y - 22, {
    size: 10,
    font: bold,
    color: C_WHITE,
  });
  text("TVA non applicable — art. 293 B du CGI", marginX + 18, y - 40, {
    size: 8.5,
    font: italic,
    color: C_WHITE,
  });
  text(formatCurrency(data.amountCents, data.currency), rightX - 18, y - 36, {
    size: 22,
    font: bold,
    color: C_WHITE,
    align: "right",
  });

  y -= totalH + 22;

  // -----------------------------------------------------------------------
  // Bank details (if provided)
  // -----------------------------------------------------------------------
  if (data.seller.iban) {
    const bankH = 54;
    page.drawRectangle({
      x: marginX,
      y: y - bankH,
      width: innerW,
      height: bankH,
      color: C_SURFACE,
      borderColor: C_LINE,
      borderWidth: 0.8,
    });
    text("RÈGLEMENT PAR VIREMENT", marginX + 14, y - 18, {
      size: 8.5,
      font: bold,
      color: C_MUTED,
    });
    text(`Bénéficiaire · ${data.seller.displayName}`, marginX + 14, y - 32, {
      size: 10,
      font: bold,
      color: C_INK,
    });
    const bankLine = `IBAN ${data.seller.iban}${data.seller.bic ? `   ·   BIC ${data.seller.bic}` : ""}`;
    text(bankLine, marginX + 14, y - 46, { size: 10, color: C_INK_600 });
    y -= bankH + 14;
  }

  // -----------------------------------------------------------------------
  // Legal footer — small muted mentions at the bottom
  // -----------------------------------------------------------------------
  const legal = [
    "TVA non applicable, art. 293 B du CGI.",
    "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).",
    "Paiement à réception, sauf mention contraire. En cas de retard : indemnité forfaitaire de 40 € (art. L441-10 du",
    "Code de commerce) et pénalités au taux de la BCE majoré de 10 points. Pas d'escompte pour paiement anticipé.",
    `Mention « ${data.seller.legalForm} » apposée conformément à l'article L526-22 du Code de commerce.`,
  ];

  const footerTop = 72 + legal.length * 10 + 8;
  page.drawLine({
    start: { x: marginX, y: footerTop },
    end: { x: rightX, y: footerTop },
    color: C_LINE,
    thickness: 0.6,
  });
  legal.forEach((line, i) =>
    text(line, marginX, 72 + (legal.length - 1 - i) * 10, {
      size: 8,
      color: C_MUTED,
    })
  );

  // Page footer — contact line
  text(
    `${data.seller.displayName} · ${data.seller.email} · SIREN ${formatSiren(data.seller.siren)}`,
    width / 2,
    40,
    { size: 8, color: C_SOFT, align: "center" }
  );
  text(`1 / 1`, rightX, 40, { size: 8, color: C_SOFT, align: "right" });

  // Decorative brand dot footer-left
  page.drawCircle({ x: marginX + 4, y: 42, size: 3, color: C_BRAND });

  // -----------------------------------------------------------------------
  // Embed Factur-X MINIMUM XML as associated file (AFRelationship=Alternative).
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

  // Mute unused-variable warnings for chip helper kept for future use
  void C_TINT_PINK;
  void C_INK_800;

  return await pdf.save();
}

// Approximate card height based on how many lines we'll actually draw.
function cardHeightSeller(data: InvoicePdfData): number {
  let lines = 1; // name header
  lines += 1; // address line 1
  if (data.seller.addressLine2) lines += 1;
  lines += 1; // postal + city
  if (data.seller.country && data.seller.country !== "France") lines += 1;
  lines += 1; // email
  lines += 2; // SIREN + SIRET
  if (data.seller.apeNaf) lines += 1;
  // 16pt top pad + 20pt header + 12pt per line + 12pt bottom pad
  return 20 + 24 + lines * 12 + 10;
}

function drawLeftBorder(
  page: import("pdf-lib").PDFPage,
  x: number,
  y: number,
  h: number,
  color: ReturnType<typeof rgb>
) {
  page.drawRectangle({ x, y, width: 3, height: h, color });
}

function drawPill(
  page: import("pdf-lib").PDFPage,
  x: number,
  y: number,
  label: string,
  value: string,
  regular: import("pdf-lib").PDFFont,
  bold: import("pdf-lib").PDFFont
) {
  const labelSize = 8;
  const valueSize = 10;
  const padX = 12;
  const labelW = bold.widthOfTextAtSize(label.toUpperCase(), labelSize);
  const valueW = regular.widthOfTextAtSize(value, valueSize);
  const w = labelW + valueW + padX * 2 + 10;
  const h = 22;
  page.drawRectangle({
    x,
    y: y - 4,
    width: w,
    height: h,
    color: C_TINT,
    borderColor: C_TINT,
    borderWidth: 0,
  });
  page.drawText(label.toUpperCase(), {
    x: x + padX,
    y: y + 2,
    size: labelSize,
    font: bold,
    color: C_BRAND,
  });
  page.drawText(value, {
    x: x + padX + labelW + 10,
    y: y + 2,
    size: valueSize,
    font: regular,
    color: C_INK,
  });
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

  const root = pdf.catalog;
  const names = root.lookup(PDFName.of("Names"));
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
      spec.set(PDFName.of("Desc"), PDFString.of("Factur-X XML"));
      const afArr = pdf.context.obj([spec]);
      root.set(PDFName.of("AF"), afArr);
    }
  }
  pdf.setKeywords(["Factur-X", "MINIMUM", "EN16931", "CII", "auto-entrepreneur"]);
  void PDFHexString;
}

function wrap(s: string, maxChars: number): string[] {
  const words = s.split(/\s+/);
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
