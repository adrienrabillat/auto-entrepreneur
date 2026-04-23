import { PDFDocument, PDFName, PDFString, PDFHexString, StandardFonts, rgb } from "pdf-lib";
import { buildFacturxMinimumXml } from "@/lib/facturx";

/**
 * Générateur PDF facture — version sobre, pro, noir + bleu foncé.
 *
 * Objectifs :
 *  - Design lisible et professionnel : pas de violet/rose, beaucoup de blanc,
 *    une barre sombre en tête et un bandeau total navy pour l'accent visuel.
 *  - Conforme aux obligations légales françaises pour un auto-entrepreneur / EI
 *    (Loi du 14 février 2022 "EI", mentions franchise en base TVA art. 293 B,
 *    pénalités L441-10, SIREN + SIRET, nature de l'opération, etc.).
 *  - Prêt pour la facturation électronique (obligation progressive Sept 2026 → 2027)
 *    via un Factur-X MINIMUM CII XML embarqué (AFRelationship = Alternative)
 *    — une Plateforme Agréée (PDP) peut ainsi extraire les données structurées
 *    directement depuis le PDF/A-3.
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

// ---------------------------------------------------------------------------
// Palette PDF — cohérente avec le thème app (noir + bleu foncé).
// ---------------------------------------------------------------------------
const C_INK         = rgb(0.059, 0.090, 0.165); // #0F172A — slate-900 (titres, totaux)
const C_INK_DEEP    = rgb(0.016, 0.027, 0.059); // #040710 — noir (bandeau)
const C_NAVY        = rgb(0.118, 0.227, 0.541); // #1E3A8A — bleu foncé (accent)
const C_NAVY_DEEP   = rgb(0.090, 0.145, 0.329); // #172554 — navy profond
const C_INK_800     = rgb(0.118, 0.161, 0.231); // #1E293B
const C_INK_600     = rgb(0.278, 0.333, 0.412); // #475569
const C_MUTED       = rgb(0.392, 0.455, 0.545); // #64748B
const C_SOFT        = rgb(0.580, 0.639, 0.722); // #94A3B8
const C_LINE        = rgb(0.882, 0.910, 0.941); // #E2E8F0
const C_SURFACE     = rgb(0.972, 0.980, 0.988); // #F8FAFC
const C_TINT        = rgb(0.945, 0.961, 0.984); // #F1F5FB — brand-50 navy-tint
const C_WHITE       = rgb(1, 1, 1);

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${data.number}`);
  pdf.setAuthor(sellerLegalLabel(data));
  pdf.setSubject(`Facture ${data.number} — ${sellerLegalLabel(data)}`);
  pdf.setProducer("auto-entrepreneur app");
  pdf.setCreator("auto-entrepreneur app");
  pdf.setCreationDate(new Date());

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([595.28, 841.89]); // A4 en points
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
  // EN-TÊTE — barre sombre fine qui porte juste "FACTURE" + numéro.
  // Sobre, lisible, tout de suite pro.
  // -----------------------------------------------------------------------
  const heroH = 64;
  const heroY = height - heroH;
  page.drawRectangle({ x: 0, y: heroY, width, height: heroH, color: C_INK_DEEP });
  // accent bleu foncé sur le côté droit — un simple rectangle fin
  page.drawRectangle({
    x: rightX - 90,
    y: heroY,
    width: 90,
    height: heroH,
    color: C_NAVY,
    opacity: 0.55,
  });

  text("FACTURE", marginX, height - 30, {
    size: 14,
    font: bold,
    color: C_WHITE,
  });
  text(`N° ${data.number}`, marginX, height - 48, {
    size: 10,
    color: C_SOFT,
  });
  text(formatCurrency(data.amountCents, data.currency), rightX - 14, height - 38, {
    size: 18,
    font: bold,
    color: C_WHITE,
    align: "right",
  });

  // -----------------------------------------------------------------------
  // Blocs parties — ÉMETTEUR (à gauche) + FACTURÉ À (à droite)
  // Fond blanc + fines bordures, mention "EI Prénom Nom" bien en évidence.
  // -----------------------------------------------------------------------
  let y = heroY - 28;
  const gap = 16;
  const colW = (innerW - gap) / 2;
  const cardH = Math.max(cardHeightSeller(data), cardHeightClient(data));

  // Émetteur
  page.drawRectangle({
    x: marginX,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: C_WHITE,
    borderColor: C_LINE,
    borderWidth: 0.8,
  });
  drawLeftBorder(page, marginX, y - cardH, cardH, C_INK_DEEP);
  text("ÉMETTEUR", marginX + 14, y - 18, { size: 8, font: bold, color: C_MUTED });

  // Ligne légale : "EI Prénom Nom" (ou "EI Prénom Nom — Nom Commercial")
  const emitterLegalLine = sellerLegalLabel(data);
  text(emitterLegalLine, marginX + 14, y - 36, {
    size: 12,
    font: bold,
    color: C_INK,
  });
  let sy = y - 52;
  if (data.seller.businessName && data.seller.businessName !== data.seller.displayName) {
    text(`Nom commercial : ${data.seller.businessName}`, marginX + 14, sy, {
      size: 9,
      color: C_INK_600,
    });
    sy -= 12;
  }
  if (data.seller.metier) {
    text(data.seller.metier, marginX + 14, sy, {
      size: 9,
      font: italic,
      color: C_INK_600,
    });
    sy -= 12;
  }
  sy -= 2;
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

  // Client
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
  drawLeftBorder(page, clientX, y - cardH, cardH, C_NAVY);
  text("FACTURÉ À", clientX + 14, y - 18, { size: 8, font: bold, color: C_MUTED });
  const clientHeader = data.client.name || data.client.email;
  text(clientHeader, clientX + 14, y - 36, { size: 12, font: bold, color: C_INK });
  let cy = y - 52;
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

  y -= cardH + 22;

  // -----------------------------------------------------------------------
  // Méta — dates + nature de l'opération sous forme d'une ligne d'étiquettes
  // -----------------------------------------------------------------------
  const metaBoxH = 42;
  page.drawRectangle({
    x: marginX,
    y: y - metaBoxH,
    width: innerW,
    height: metaBoxH,
    color: C_TINT,
    borderColor: C_TINT,
    borderWidth: 0,
  });

  const metaColW = innerW / 3;
  drawMeta(page, marginX + 14,            y - 14, "Émise le", formatFr(data.issuedOn), regular, bold);
  if (data.dueOn) {
    drawMeta(page, marginX + metaColW + 14, y - 14, "Échéance", formatFr(data.dueOn), regular, bold);
  }
  const opLabel =
    data.operationType === "vente"
      ? "Vente de biens"
      : data.operationType === "mixte"
      ? "Vente + prestation"
      : "Prestation de services";
  drawMeta(page, marginX + 2 * metaColW + 14, y - 14, "Nature", opLabel, regular, bold);

  if (data.deliveryAddress && data.operationType !== "service") {
    text(`Livraison : ${data.deliveryAddress}`, rightX - 14, y - 34, {
      size: 8.5,
      color: C_MUTED,
      align: "right",
    });
  }

  y -= metaBoxH + 22;

  // -----------------------------------------------------------------------
  // Table — description / montant
  // -----------------------------------------------------------------------
  const tableHeaderH = 30;
  page.drawRectangle({
    x: marginX,
    y: y - tableHeaderH,
    width: innerW,
    height: tableHeaderH,
    color: C_INK,
  });
  text("DESCRIPTION", marginX + 16, y - 20, {
    size: 9,
    font: bold,
    color: C_WHITE,
  });
  text("MONTANT", rightX - 16, y - 20, {
    size: 9,
    font: bold,
    color: C_WHITE,
    align: "right",
  });
  y -= tableHeaderH;

  const wrapped = wrap(data.description, 62);
  const rowH = Math.max(42, wrapped.length * 14 + 22);
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
    text(line, marginX + 16, y - 20 - i * 14, {
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
  y -= rowH + 16;

  // -----------------------------------------------------------------------
  // Bandeau TOTAL — plein largeur, navy profond
  // -----------------------------------------------------------------------
  const totalH = 64;
  page.drawRectangle({
    x: marginX,
    y: y - totalH,
    width: innerW,
    height: totalH,
    color: C_INK_DEEP,
  });
  // Surcharge navy à droite pour un accent subtil
  page.drawRectangle({
    x: rightX - 120,
    y: y - totalH,
    width: 120,
    height: totalH,
    color: C_NAVY,
    opacity: 0.35,
  });
  text("TOTAL NET À PAYER", marginX + 18, y - 24, {
    size: 10,
    font: bold,
    color: C_WHITE,
  });
  text("TVA non applicable — art. 293 B du CGI", marginX + 18, y - 42, {
    size: 8.5,
    font: italic,
    color: C_SOFT,
  });
  text(formatCurrency(data.amountCents, data.currency), rightX - 18, y - 38, {
    size: 22,
    font: bold,
    color: C_WHITE,
    align: "right",
  });
  y -= totalH + 20;

  // -----------------------------------------------------------------------
  // RIB / Règlement — toujours affiché, même sans IBAN renseigné, pour
  // que la facture soit explicite côté client.
  // -----------------------------------------------------------------------
  const hasIban = Boolean(data.seller.iban);
  const bankH = hasIban ? 86 : 58;
  page.drawRectangle({
    x: marginX,
    y: y - bankH,
    width: innerW,
    height: bankH,
    color: C_SURFACE,
    borderColor: C_LINE,
    borderWidth: 0.8,
  });
  drawLeftBorder(page, marginX, y - bankH, bankH, C_NAVY_DEEP);
  text("RÈGLEMENT PAR VIREMENT BANCAIRE", marginX + 16, y - 18, {
    size: 9,
    font: bold,
    color: C_NAVY_DEEP,
  });

  if (hasIban) {
    text(`Bénéficiaire`, marginX + 16, y - 36, { size: 8, color: C_MUTED });
    text(data.seller.displayName, marginX + 16, y - 48, {
      size: 10.5,
      font: bold,
      color: C_INK,
    });
    text(`IBAN`, marginX + 16, y - 64, { size: 8, color: C_MUTED });
    text(formatIban(data.seller.iban!), marginX + 16, y - 76, {
      size: 10.5,
      font: bold,
      color: C_INK,
    });
    if (data.seller.bic) {
      text(`BIC`, marginX + 260, y - 64, { size: 8, color: C_MUTED });
      text(data.seller.bic, marginX + 260, y - 76, {
        size: 10.5,
        font: bold,
        color: C_INK,
      });
    }
    text(`Référence à rappeler : ${data.number}`, rightX - 16, y - 48, {
      size: 9,
      color: C_INK_600,
      align: "right",
    });
  } else {
    text(
      "IBAN non renseigné — va dans Profil → Coordonnées bancaires pour l'ajouter.",
      marginX + 16,
      y - 38,
      { size: 9.5, color: C_MUTED, font: italic }
    );
    text(`Référence à rappeler : ${data.number}`, marginX + 16, y - 52, {
      size: 9,
      color: C_INK_600,
    });
  }
  y -= bankH + 18;

  // -----------------------------------------------------------------------
  // Mentions légales — petit texte sobre en bas de page
  // -----------------------------------------------------------------------
  const legal = [
    "TVA non applicable, art. 293 B du CGI.",
    "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).",
    "Paiement à réception sauf mention contraire. En cas de retard : indemnité forfaitaire de 40 € (art. L441-10 du",
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

  // Bas de page — ligne contact
  text(
    `${sellerLegalLabel(data)} · ${data.seller.email} · SIREN ${formatSiren(data.seller.siren)}`,
    width / 2,
    40,
    { size: 8, color: C_SOFT, align: "center" }
  );
  text(`1 / 1`, rightX, 40, { size: 8, color: C_SOFT, align: "right" });

  // Petit marqueur navy discret en bas à gauche
  page.drawCircle({ x: marginX + 4, y: 42, size: 3, color: C_NAVY });

  // -----------------------------------------------------------------------
  // Factur-X MINIMUM — XML CII attaché, AFRelationship = Alternative.
  // Ce qui rend le PDF "lisible" par les Plateformes Agréées (PDP) du
  // dispositif de facturation électronique 2026-2027.
  // -----------------------------------------------------------------------
  const xml = buildFacturxMinimumXml({
    number: data.number,
    issuedOnIso: data.issuedOn,
    currency: data.currency,
    totalCents: data.amountCents,
    seller: {
      legalName: sellerLegalLabel(data),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Libellé légal "EI Prénom Nom" (ou EURL / SASU etc. selon legalForm).
// Respecte la Loi du 14 février 2022 qui impose d'adjoindre la mention
// "EI" ou "Entrepreneur Individuel" au nom de l'entrepreneur sur tous les
// documents professionnels.
function sellerLegalLabel(data: InvoicePdfData): string {
  const form = (data.seller.legalForm || "EI").trim();
  return `${form} ${data.seller.displayName}`.trim();
}

// Approximation de la hauteur nécessaire pour la carte "émetteur".
function cardHeightSeller(data: InvoicePdfData): number {
  let lines = 1;                              // titre "EI Prénom Nom"
  if (data.seller.businessName) lines += 1;   // nom commercial éventuel
  if (data.seller.metier) lines += 1;         // métier
  lines += 1;                                 // adresse ligne 1
  if (data.seller.addressLine2) lines += 1;
  lines += 1;                                 // CP + ville
  if (data.seller.country && data.seller.country !== "France") lines += 1;
  lines += 1;                                 // email
  lines += 2;                                 // SIREN + SIRET
  if (data.seller.apeNaf) lines += 1;
  return 20 + 28 + lines * 12 + 14;
}

function cardHeightClient(data: InvoicePdfData): number {
  let lines = 1;                              // nom / email principal
  if (data.client.address) lines += data.client.address.split(/\r?\n/).length;
  if (data.client.name) lines += 1;           // email secondaire
  if (data.client.siren) lines += 1;
  return 20 + 28 + lines * 12 + 14;
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

function drawMeta(
  page: import("pdf-lib").PDFPage,
  x: number,
  y: number,
  label: string,
  value: string,
  regular: import("pdf-lib").PDFFont,
  bold: import("pdf-lib").PDFFont
) {
  page.drawText(label.toUpperCase(), {
    x,
    y: y - 4,
    size: 7.5,
    font: bold,
    color: C_MUTED,
  });
  page.drawText(value, {
    x,
    y: y - 18,
    size: 11,
    font: regular,
    color: C_INK,
  });
}

// ---------------------------------------------------------------------------
// Factur-X attachment — AFRelationship "Alternative" (primary structured data).
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

// IBAN groupé en blocs de 4 caractères, sans espaces indésirables.
function formatIban(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  return compact.replace(/(.{4})/g, "$1 ").trim();
}
