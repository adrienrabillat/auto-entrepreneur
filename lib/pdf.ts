import { PDFDocument, PDFName, PDFString, PDFHexString, StandardFonts, rgb } from "pdf-lib";
import { buildFacturxMinimumXml } from "@/lib/facturx";

/**
 * Générateur PDF facture — refonte minimaliste.
 *
 * Inspiration : le modèle "INVOICE #1024" proposé par l'utilisateur
 * (typographie claire, aucune barre colorée, beaucoup de blanc) + la
 * facture Picapot pour les mentions légales françaises.
 *
 * Objectifs :
 *  - Lisibilité maximale, typographie sobre, zéro fioriture.
 *  - Conforme aux mentions obligatoires auto-entrepreneur (URSSAF) :
 *    nom + EI, nom commercial, adresse, téléphone, email, site,
 *    SIRET, RCS/RM, raison sociale + adresse client, numéro de facture
 *    chronologique, qté + PU + total HT, date d'émission, date de
 *    règlement, date d'exécution, « TVA non applicable, art. 293 B du
 *    CGI », taux pénalités de retard, indemnité forfaitaire 40 €,
 *    conditions d'escompte (« Néant » par défaut), assurance pro.
 *  - Prêt pour la facturation électronique (Sept 2026) via un
 *    Factur-X MINIMUM CII XML embarqué (AFRelationship = Alternative).
 */

export type OperationType = "service" | "vente" | "mixte";

export type InvoicePdfData = {
  number: string;
  /** Type de document. 'invoice' = facture (par défaut, comportement
   *  historique). 'quote' = devis : titre "DEVIS", date d'échéance affichée
   *  comme "Validité" et bandeau légal adapté. 'credit_note' = avoir :
   *  titre "AVOIR" avec montants affichés en négatif. */
  documentKind?: "invoice" | "quote" | "credit_note";
  issuedOn: string;              // ISO date (YYYY-MM-DD)
  dueOn?: string;                // optional ISO date — date de règlement (facture) OU validité (devis)
  executionDate?: string;        // ISO date — date de réalisation / livraison
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;           // total HT = qty × PU
  currency: string;              // "EUR"
  operationType: OperationType;
  deliveryAddress?: string;
  paymentTerms?: string;         // "Paiement à réception", "30 jours..."
  discountTerms?: string;        // default: "Néant"
  /** Si présente → facture acquittée, stamp "ACQUITTÉE" + "Payée le …" sur le PDF. */
  paidAt?: string;
  seller: {
    displayName: string;
    businessName?: string;
    legalForm: string;           // "EI"
    metier: string;
    siren: string;
    siret: string;
    apeNaf?: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
    city: string;
    country: string;
    phone?: string;
    website?: string;
    email: string;
    iban: string;                // obligatoire
    bic: string;                 // obligatoire
    rcsNumber?: string;
    rcsCity?: string;
    rmNumber?: string;
    rmDepartment?: string;
    insuranceName?: string;
    insuranceCoverage?: string;
    /** Médiateur de la consommation — mention obligatoire sur factures BtoC (art. L616-1). */
    mediatorName?: string;
    /** URL publique du médiateur (même règle que mediatorName). */
    mediatorWebsite?: string;
  };
  client: {
    name?: string;
    email: string;
    /**
     * SIREN client : sert aussi de marqueur BtoB. Si absent, la facture est
     * considérée BtoC et on affiche les mentions de médiation conso.
     */
    siren?: string;
    address?: string;
  };
};

// ---------------------------------------------------------------------------
// Palette — noir + navy très discrets, beaucoup de gris neutres.
// ---------------------------------------------------------------------------
const C_INK      = rgb(0.059, 0.090, 0.165); // #0F172A
const C_INK_900  = rgb(0.016, 0.027, 0.059); // #040710
const C_NAVY     = rgb(0.118, 0.227, 0.541); // #1E3A8A (accent fin)
const C_INK_700  = rgb(0.196, 0.255, 0.329); // #334155
const C_INK_500  = rgb(0.392, 0.455, 0.545); // #64748B
const C_INK_400  = rgb(0.580, 0.639, 0.722); // #94A3B8
const C_LINE     = rgb(0.882, 0.910, 0.941); // #E2E8F0
const C_LINE_SOFT= rgb(0.941, 0.953, 0.969); // #F1F5F9
const C_PAID     = rgb(0.086, 0.537, 0.310); // #16A34A — vert sobre pour "ACQUITTÉE"
const C_PAID_SOFT= rgb(0.925, 0.972, 0.933); // #ECF8EE

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // Devis ou facture : on adapte uniquement les libellés visibles. Le
  // reste du layout (en-tête, bloc vendeur, bloc client, prestations,
  // totaux, mentions légales) reste strictement identique pour cohérence
  // visuelle entre les deux types de documents.
  const isQuote = data.documentKind === "quote";
  const isCreditNote = data.documentKind === "credit_note";
  const docNoun = isCreditNote ? "Avoir" : isQuote ? "Devis" : "Facture";
  const docTitle = isCreditNote ? "AVOIR" : isQuote ? "DEVIS" : "FACTURE";
  pdf.setTitle(`${docNoun} ${data.number}`);
  pdf.setAuthor(sellerLegalLabel(data));
  pdf.setSubject(`${docNoun} ${data.number} — ${sellerLegalLabel(data)}`);
  pdf.setProducer("auto-entrepreneur app");
  pdf.setCreator("auto-entrepreneur app");
  pdf.setCreationDate(new Date());

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic  = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const marginX = 56;
  const rightX = width - marginX;
  const innerW = rightX - marginX;

  // ----------------------------------------------------------------
  // Primitive de dessin texte
  // ----------------------------------------------------------------
  const draw = (
    t: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      font?: typeof regular;
      color?: typeof C_INK;
      align?: "left" | "right" | "center";
      tracking?: number; // letter-spacing simulé en insérant des espaces fines (uniquement pour labels all-caps)
    } = {}
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const color = opts.color ?? C_INK;
    // Sanitize systématique : les StandardFonts pdf-lib ne supportent que
    // l'encodage WinAnsi. Intl.NumberFormat("fr-FR") insère un U+202F
    // (narrow no-break space) avant le « € » sur Node 18+, et certains
    // copier-coller utilisateur ramènent des U+00A0 / U+2009. Sans nettoyage,
    // pdf-lib lève "WinAnsi cannot encode ' ' (0x202f)" et la génération
    // PDF plante. Voir toWinAnsi() en bas de fichier pour la table de mapping.
    const sanitized = toWinAnsi(t);
    const txt = opts.tracking && opts.tracking > 0 ? spreadLetters(sanitized) : sanitized;
    const tw = font.widthOfTextAtSize(txt, size);
    let xx = x;
    if (opts.align === "right") xx = x - tw;
    else if (opts.align === "center") xx = x - tw / 2;
    page.drawText(txt, { x: xx, y, size, font, color });
    return tw;
  };

  const line = (x1: number, y1: number, x2: number, y2: number, color = C_LINE, thickness = 0.6) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });

  // Cursor vertical (on descend depuis le haut)
  let y = height - 64;

  // ----------------------------------------------------------------
  // TITRE — "FACTURE" à gauche, numéro à droite.
  // Si acquittée : tampon vert "ACQUITTÉE" sous le titre.
  // ----------------------------------------------------------------
  draw(docTitle, marginX, y, { size: 28, font: bold, color: C_INK_900 });
  draw(`#${data.number}`, rightX, y + 6, {
    size: 13,
    font: regular,
    color: C_INK_500,
    align: "right",
  });

  if (data.paidAt) {
    // Pastille verte sous le titre, alignée à gauche.
    const label = "ACQUITTÉE";
    const padX = 8;
    const padY = 3;
    const size = 9;
    const w = bold.widthOfTextAtSize(label, size) + padX * 2;
    const h = size + padY * 2;
    const bx = marginX;
    const by = y - 20;
    page.drawRectangle({
      x: bx,
      y: by - h + size + padY,
      width: w,
      height: h,
      color: C_PAID_SOFT,
      borderColor: C_PAID,
      borderWidth: 0.8,
    });
    draw(label, bx + padX, by, { size, font: bold, color: C_PAID });
  }

  y -= data.paidAt ? 52 : 36;

  // ----------------------------------------------------------------
  // Ligne méta : Date d'émission / Règlement (ou "Payée le") / Exécution
  // ----------------------------------------------------------------
  const metaCols = [
    { label: "DATE D'ÉMISSION", value: formatFr(data.issuedOn) },
    data.paidAt
      ? { label: "PAYÉE LE", value: formatFr(data.paidAt.slice(0, 10)) }
      : data.dueOn
        ? { label: "DATE DE RÈGLEMENT", value: formatFr(data.dueOn) }
        : { label: "RÈGLEMENT", value: data.paymentTerms || "À réception" },
    data.executionDate
      ? { label: "DATE D'EXÉCUTION", value: formatFr(data.executionDate) }
      : { label: "NATURE", value: operationLabel(data.operationType) },
  ];

  const metaColW = innerW / metaCols.length;
  metaCols.forEach((m, i) => {
    const x = marginX + i * metaColW;
    draw(m.label, x, y, { size: 7.5, font: bold, color: C_INK_400 });
    draw(m.value, x, y - 15, { size: 11, font: regular, color: C_INK });
  });

  y -= 34;
  line(marginX, y, rightX, y);
  y -= 28;

  // ----------------------------------------------------------------
  // Blocs parties : ÉMETTEUR (gauche) + FACTURÉ À (droite)
  // Pas de cadre, pas de fond — juste deux colonnes de texte.
  // ----------------------------------------------------------------
  const blockTop = y;
  const colGap = 24;
  const colW = (innerW - colGap) / 2;

  // Émetteur
  draw("ÉMETTEUR", marginX, blockTop, { size: 7.5, font: bold, color: C_INK_400 });
  let sy = blockTop - 18;
  draw(sellerLegalLabel(data), marginX, sy, { size: 13, font: bold, color: C_INK_900 });
  sy -= 16;
  if (data.seller.businessName && data.seller.businessName !== data.seller.displayName) {
    draw(data.seller.businessName, marginX, sy, { size: 10, font: italic, color: C_INK_700 });
    sy -= 13;
  }
  if (data.seller.metier) {
    draw(data.seller.metier, marginX, sy, { size: 10, color: C_INK_500 });
    sy -= 13;
  }
  sy -= 4;
  for (const line of sellerAddressLines(data)) {
    draw(line, marginX, sy, { size: 10, color: C_INK_700 });
    sy -= 13;
  }
  sy -= 2;
  draw(`SIRET ${formatSiret(data.seller.siret)}`, marginX, sy, { size: 9.5, color: C_INK_500 });
  sy -= 12;
  if (data.seller.apeNaf) {
    draw(`APE ${data.seller.apeNaf}`, marginX, sy, { size: 9.5, color: C_INK_500 });
    sy -= 12;
  }
  const sellerBottom = sy;

  // Facturé à
  const clientX = marginX + colW + colGap;
  draw("FACTURÉ À", clientX, blockTop, { size: 7.5, font: bold, color: C_INK_400 });
  let cy = blockTop - 18;
  const clientHeader = data.client.name || data.client.email;
  draw(clientHeader, clientX, cy, { size: 13, font: bold, color: C_INK_900 });
  cy -= 16;
  if (data.client.address) {
    for (const ln of data.client.address.split(/\r?\n/)) {
      draw(ln, clientX, cy, { size: 10, color: C_INK_700 });
      cy -= 13;
    }
    cy -= 2;
  }
  if (data.client.name) {
    draw(data.client.email, clientX, cy, { size: 10, color: C_INK_500 });
    cy -= 13;
  }
  if (data.client.siren) {
    draw(`SIREN ${formatSiren(data.client.siren)}`, clientX, cy, { size: 9.5, color: C_INK_500 });
    cy -= 12;
  }
  const clientBottom = cy;

  y = Math.min(sellerBottom, clientBottom) - 18;

  // ----------------------------------------------------------------
  // Tableau : Description | Qté | Prix unitaire HT | Total HT
  // Très épuré : pas de header coloré, juste un filet en haut et en bas.
  // ----------------------------------------------------------------
  const qtyX    = rightX - 230;
  const unitX   = rightX - 130;
  const totalX  = rightX;

  // Entête
  line(marginX, y + 18, rightX, y + 18);
  draw("DESCRIPTION", marginX, y, { size: 8, font: bold, color: C_INK_400 });
  draw("QTÉ", qtyX, y, { size: 8, font: bold, color: C_INK_400, align: "right" });
  draw("PU HT", unitX, y, { size: 8, font: bold, color: C_INK_400, align: "right" });
  draw("TOTAL HT", totalX, y, { size: 8, font: bold, color: C_INK_400, align: "right" });
  y -= 10;
  line(marginX, y, rightX, y);
  y -= 22;

  // Ligne produit — wrap mesuré à la vraie largeur de la colonne Description
  // pour garantir qu'aucun mot ne déborde dans la colonne QTÉ.
  // On laisse 12pt de marge de sécurité avant la colonne des quantités.
  const descColW = qtyX - marginX - 12;
  const wrapped = wrapByWidth(data.description, regular, 11, descColW);
  wrapped.forEach((l, i) =>
    draw(l, marginX, y - i * 14, { size: 11, color: C_INK_900, font: regular })
  );
  draw(formatQuantity(data.quantity), qtyX, y, {
    size: 11, font: regular, color: C_INK_900, align: "right",
  });
  draw(formatCurrency(data.unitPriceCents, data.currency), unitX, y, {
    size: 11, font: regular, color: C_INK_900, align: "right",
  });
  draw(formatCurrency(data.amountCents, data.currency), totalX, y, {
    size: 11, font: bold, color: C_INK_900, align: "right",
  });
  y -= Math.max(26, wrapped.length * 14 + 10);

  line(marginX, y, rightX, y);
  y -= 26;

  // ----------------------------------------------------------------
  // Totaux (alignés à droite, toujours sur la même colonne)
  // ----------------------------------------------------------------
  const totalsLeft = rightX - 260;
  draw("Sous-total HT", totalsLeft, y, { size: 10, color: C_INK_500 });
  draw(formatCurrency(data.amountCents, data.currency), totalX, y, {
    size: 10, color: C_INK_900, align: "right",
  });
  y -= 16;

  draw("TVA (non applicable, art. 293 B du CGI)", totalsLeft, y, {
    size: 10, color: C_INK_500,
  });
  draw(formatCurrency(0, data.currency), totalX, y, {
    size: 10, color: C_INK_500, align: "right",
  });
  y -= 22;

  line(totalsLeft, y + 6, rightX, y + 6, C_LINE, 0.6);

  draw("TOTAL", totalsLeft, y - 8, { size: 12, font: bold, color: C_INK_900 });
  draw(formatCurrency(data.amountCents, data.currency), totalX, y - 8, {
    size: 16, font: bold, color: C_INK_900, align: "right",
  });

  y -= 24;

  // Ligne "Solde dû" — toujours affichée. Passe à 0 quand la facture est
  // acquittée (= paiement déjà reçu), colorée en vert pour éviter toute
  // ambiguïté avec le client.
  const paid = Boolean(data.paidAt);
  draw("Solde dû", totalsLeft, y, {
    size: 10, font: bold, color: paid ? C_PAID : C_INK_900,
  });
  draw(paid ? "0,00 €" : formatCurrency(data.amountCents, data.currency), totalX, y, {
    size: 12, font: bold, color: paid ? C_PAID : C_INK_900, align: "right",
  });
  if (paid) {
    draw("· Facture acquittée", totalsLeft + 55, y, {
      size: 9, font: italic, color: C_PAID,
    });
  }

  y -= 28;

  // ----------------------------------------------------------------
  // Bloc règlement
  //   • facture normale  → IBAN / BIC / référence
  //   • facture acquittée → bandeau vert "Paiement reçu", pas d'IBAN
  // ----------------------------------------------------------------
  y -= 6;
  if (data.paidAt) {
    // Bandeau "Paiement reçu"
    const bw = innerW;
    const bh = 40;
    const by = y - bh + 12;
    page.drawRectangle({
      x: marginX, y: by, width: bw, height: bh,
      color: C_PAID_SOFT, borderColor: C_PAID, borderWidth: 0.8,
    });
    draw("PAIEMENT REÇU", marginX + 14, y - 4, {
      size: 9, font: bold, color: C_PAID,
    });
    draw(
      `Facture acquittée le ${formatFr(data.paidAt.slice(0, 10))} · Aucun règlement n'est dû.`,
      marginX + 14, y - 20,
      { size: 10, font: regular, color: C_INK_700 }
    );
    y -= bh + 18;
  } else {
    draw("RÈGLEMENT PAR VIREMENT BANCAIRE", marginX, y, {
      size: 7.5, font: bold, color: C_INK_400,
    });
    y -= 16;

    const payCol1X = marginX;
    const payCol2X = marginX + 280;

    draw("Bénéficiaire", payCol1X, y, { size: 9, color: C_INK_500 });
    draw(data.seller.displayName, payCol1X, y - 13, {
      size: 11, font: bold, color: C_INK_900,
    });

    draw("BIC", payCol2X, y, { size: 9, color: C_INK_500 });
    draw(data.seller.bic.toUpperCase(), payCol2X, y - 13, {
      size: 11, font: bold, color: C_INK_900,
    });

    y -= 32;

    draw("IBAN", payCol1X, y, { size: 9, color: C_INK_500 });
    draw(formatIban(data.seller.iban), payCol1X, y - 13, {
      size: 11, font: bold, color: C_INK_900,
    });

    draw("Référence à rappeler", payCol2X, y, { size: 9, color: C_INK_500 });
    draw(data.number, payCol2X, y - 13, {
      size: 11, font: bold, color: C_INK_900,
    });

    y -= 36;

    // Accent navy discret : un petit trait sous le bloc règlement
    page.drawRectangle({ x: marginX, y: y + 2, width: 32, height: 2, color: C_NAVY });
    y -= 18;
  }

  // ----------------------------------------------------------------
  // Mentions légales URSSAF — pied de page, petit corps
  // ----------------------------------------------------------------
  const legal = buildLegalFooter(data);
  const footerLineH = 10;
  const footerBottom = 56;
  const footerTop = footerBottom + legal.length * footerLineH + 10;

  // Filet au-dessus du pied de page légal
  line(marginX, footerTop, rightX, footerTop);

  legal.forEach((ln, i) => {
    draw(ln, marginX, footerBottom + (legal.length - 1 - i) * footerLineH, {
      size: 7.5, color: C_INK_500, font: regular,
    });
  });

  // Tout en bas : contact + pagination
  draw(
    `${sellerLegalLabel(data)} — ${data.seller.email}${data.seller.phone ? " — " + data.seller.phone : ""}`,
    width / 2,
    38,
    { size: 7.5, color: C_INK_400, align: "center" }
  );
  draw("1 / 1", rightX, 38, { size: 7.5, color: C_INK_400, align: "right" });

  // ----------------------------------------------------------------
  // Factur-X BASIC (EN 16931-compliant) — XML CII attaché
  // Profile suffisant pour l'obligation B2B française 2026/2027.
  // ----------------------------------------------------------------
  const xml = buildFacturxMinimumXml({
    number: data.number,
    issuedOnIso: data.issuedOn,
    dueOnIso: data.dueOn,
    executionDateIso: data.executionDate,
    currency: data.currency,
    description: data.description,
    quantity: data.quantity,
    unitPriceCents: data.unitPriceCents,
    lineTotalCents: data.amountCents,
    totalCents: data.amountCents,
    duePayableCents: data.amountCents,
    paymentTermsText: data.paymentTerms,
    iban: data.seller.iban,
    bic: data.seller.bic,
    paid: Boolean(data.paidAt),
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
      addressLine1: data.client.address?.split(/\r?\n/)[0],
    },
  });
  await embedFacturxXml(pdf, xml);

  return await pdf.save();
}

// ---------------------------------------------------------------------------
// Pied de page légal — toutes les mentions obligatoires URSSAF en petit.
// ---------------------------------------------------------------------------
function buildLegalFooter(data: InvoicePdfData): string[] {
  const lines: string[] = [];

  // TVA
  lines.push("TVA non applicable, art. 293 B du CGI.");

  // Retards de paiement + indemnité forfaitaire
  lines.push(
    "En cas de retard de paiement : pénalités au taux de la BCE majoré de 10 points et indemnité forfaitaire de 40 € " +
      "pour frais de recouvrement (art. L441-10 du Code de commerce)."
  );

  // Escompte
  const escompte = (data.discountTerms || "Néant").trim();
  lines.push(`Escompte pour paiement anticipé : ${escompte}.`);

  // RCS / RM selon ce qui est renseigné — sinon mention "dispensé"
  const regs: string[] = [];
  if (data.seller.rcsNumber) {
    regs.push(`RCS ${data.seller.rcsCity ? data.seller.rcsCity + " " : ""}${formatSiren(data.seller.rcsNumber)}`);
  }
  if (data.seller.rmNumber) {
    regs.push(`RM ${formatSiren(data.seller.rmNumber)}${data.seller.rmDepartment ? " / " + data.seller.rmDepartment : ""}`);
  }
  if (regs.length) {
    lines.push("Immatriculation : " + regs.join(" — ") + ".");
  } else {
    lines.push(
      "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM)."
    );
  }

  // Assurance pro
  if (data.seller.insuranceName) {
    const cov = data.seller.insuranceCoverage ? ` — couverture : ${data.seller.insuranceCoverage}` : "";
    lines.push(`Assurance responsabilité civile professionnelle : ${data.seller.insuranceName}${cov}.`);
  }

  // Médiateur de la consommation (art. L616-1 Code de la consommation).
  // Obligatoire uniquement sur les factures BtoC. Heuristique : pas de SIREN
  // client => particulier. Les champs médiateur vides => pas de mention
  // (utile tant que l'émetteur n'a pas encore adhéré à un médiateur).
  const isBtoC = !data.client.siren;
  if (isBtoC && data.seller.mediatorName) {
    const site = data.seller.mediatorWebsite ? ` — ${data.seller.mediatorWebsite}` : "";
    lines.push(
      `En cas de litige non résolu à l'amiable, le client peut saisir gratuitement le médiateur de la consommation : ${data.seller.mediatorName}${site}.`
    );
  }

  // Mention EI (Loi 14 fév. 2022, L526-22)
  lines.push(
    `Mention « ${data.seller.legalForm} » apposée conformément à l'article L526-22 du Code de commerce.`
  );

  // Contact / site
  const contactBits: string[] = [];
  if (data.seller.website) contactBits.push(data.seller.website);
  if (data.seller.phone) contactBits.push(data.seller.phone);
  if (contactBits.length) lines.push(contactBits.join(" — "));

  return lines;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sellerLegalLabel(data: InvoicePdfData): string {
  const form = (data.seller.legalForm || "EI").trim();
  return `${form} ${data.seller.displayName}`.trim();
}

function sellerAddressLines(data: InvoicePdfData): string[] {
  const arr: string[] = [];
  arr.push(data.seller.addressLine1);
  if (data.seller.addressLine2) arr.push(data.seller.addressLine2);
  arr.push(`${data.seller.postalCode} ${data.seller.city}`);
  if (data.seller.country && data.seller.country !== "France") arr.push(data.seller.country);
  arr.push(data.seller.email);
  if (data.seller.phone) arr.push(data.seller.phone);
  return arr.filter(Boolean);
}

function operationLabel(o: OperationType): string {
  return o === "vente"
    ? "Vente de biens"
    : o === "mixte"
    ? "Vente + prestation"
    : "Prestation de services";
}

async function embedFacturxXml(pdf: PDFDocument, xml: string) {
  const xmlBytes = new TextEncoder().encode(xml);
  await pdf.attach(xmlBytes, "factur-x.xml", {
    mimeType: "application/xml",
    description: "Factur-X (BASIC profile, EN 16931) — données structurées de la facture",
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
  pdf.setKeywords(["Factur-X", "BASIC", "EN16931", "CII", "auto-entrepreneur"]);
  void PDFHexString;
}

/**
 * Wrap un texte en utilisant la vraie largeur mesurée par la police pdf-lib.
 * Évite les débordements dans les colonnes voisines (QTÉ / PU).
 *
 * - `maxWidth` : largeur disponible en points PDF.
 * - Découpe d'abord par espaces.
 * - Si un mot seul dépasse `maxWidth` (URL longue, mot composé sans espace),
 *   on le casse caractère par caractère pour garantir qu'aucune ligne ne déborde.
 */
type MeasuringFont = { widthOfTextAtSize: (text: string, size: number) => number };

function wrapByWidth(
  s: string,
  font: MeasuringFont,
  size: number,
  maxWidth: number
): string[] {
  const src = (s ?? "").trim();
  if (!src) return [""];
  const fits = (t: string) => font.widthOfTextAtSize(t, size) <= maxWidth;
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  const words = src.split(/\s+/);
  for (const wordRaw of words) {
    // Si le mot seul dépasse la largeur, on le segmente caractère par caractère.
    if (!fits(wordRaw)) {
      pushCurrent();
      let chunk = "";
      for (const ch of wordRaw) {
        if (fits(chunk + ch)) {
          chunk += ch;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
      continue;
    }
    const candidate = current ? current + " " + wordRaw : wordRaw;
    if (fits(candidate)) {
      current = candidate;
    } else {
      pushCurrent();
      current = wordRaw;
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

function formatQuantity(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatSiren(s: string) {
  const d = (s || "").replace(/\D/g, "");
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}` : s;
}

function formatSiret(s: string) {
  const d = (s || "").replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9, 14)}` : s;
}

function formatIban(raw: string): string {
  const compact = (raw || "").replace(/\s+/g, "").toUpperCase();
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

// Espacement typographique simulé : n'applique qu'aux chaines all-caps
// (labels « DESCRIPTION », « FACTURE »…). On ajoute un caractère espace
// standard entre chaque lettre — les polices StandardFonts de pdf-lib
// n'acceptent que le jeu WinAnsi, donc pas de thin space Unicode ici.
function spreadLetters(s: string): string {
  if (!s) return s;
  return s.split("").join(" ");
}

/**
 * Remplace les caractères Unicode hors du sous-ensemble WinAnsi par leur
 * équivalent le plus proche, pour que pdf-lib (qui utilise StandardFonts +
 * encodage WinAnsi) puisse les rendre sans planter.
 *
 * Cas concret rencontré : Intl.NumberFormat("fr-FR", {style:"currency"})
 * renvoie depuis Node 18+ « 1 200,00 € » avec un U+202F (narrow no-break
 * space) entre le nombre et l'€. WinAnsi ne connaît pas ce caractère →
 * pdf-lib lève "WinAnsi cannot encode ' ' (0x202f)" et toute la génération
 * échoue. On normalise donc tous les espaces Unicode "exotiques" en espace
 * standard, et les guillemets/tirets typographiques courants en leur
 * version ASCII si on tombe dessus.
 *
 * Important : on remplace AUSSI les U+0009 (tab) et U+000B (vertical tab)
 * qui ne sont pas dans WinAnsi.
 */
function toWinAnsi(input: string | null | undefined): string {
  if (!input) return "";
  return input
    // Espaces Unicode hors WinAnsi -> espace ASCII (0x20).
    // Inclut : NBSP (00A0), OGHAM SPACE (1680), EN QUAD..HAIR SPACE (2000-200A),
    // LINE SEP (2028), PARA SEP (2029), narrow no-break space (202F),
    // MEDIUM MATH SPACE (205F), IDEOGRAPHIC SPACE (3000).
    // \u2028/\u2029 OBLIGATOIREMENT en escape : JS les traite comme line
    // terminators dans une regex literal et casse le source sinon.
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, " ")
    // Zero-width chars -> on retire (200B-200D, WJ 2060, BOM FEFF).
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    // Tabs -> espace
    .replace(/\t/g, " ");
}
