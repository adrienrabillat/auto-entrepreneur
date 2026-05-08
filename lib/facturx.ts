/**
 * Factur-X (profil BASIC / EN 16931-compliant) — CII D16B XML generator.
 *
 * Factur-X est le format hybride franco-allemand d'e-invoice imposé pour le
 * B2B en France (réception : 1 sept. 2026 / émission TPE & micro : 1 sept. 2027).
 * C'est un PDF/A-3 avec un XML UN/CEFACT Cross Industry Invoice embarqué
 * (syntaxe D16B, modèle sémantique EN 16931).
 *
 * ┌──── Hiérarchie des profils Factur-X ─────────────────────────┐
 * │  MINIMUM  : métadonnées header + totaux — insuffisant 2026   │
 * │  BASIC WL : idem + pas de lignes                             │
 * │  BASIC    : + lignes de facture + TVA détaillée  ← on est là │
 * │  EN 16931 : + adjustments, remises, notes                    │
 * │  EXTENDED : tous les champs optionnels                       │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Le BASIC est le seuil minimum pour la conformité e-invoicing B2B française
 * à partir de 2026 — tous les profils plus riches l'étendent.
 *
 * Les auto-entrepreneurs en franchise en base : CategoryCode = "E" (Exempted)
 * avec ExemptionReason "TVA non applicable, art. 293 B du CGI" et
 * ExemptionReasonCode "VATEX-FR-FRANCHISE" + RateApplicablePercent = 0.00.
 *
 * Spec : https://fnfe-mpe.org/factur-x/ et EN 16931-1:2017.
 */

export type FacturxInput = {
  number: string;                 // "2026-0001"
  issuedOnIso: string;            // YYYY-MM-DD
  dueOnIso?: string;              // date d'échéance (optionnel)
  executionDateIso?: string;      // date d'exécution / livraison (optionnel, défaut = issuedOn)
  currency: string;               // "EUR"
  /** Description de la ligne (texte libre, max ~500 chars). */
  description: string;
  /** Quantité de la ligne (généralement 1). */
  quantity: number;
  /** Prix unitaire HT en centimes. */
  unitPriceCents: number;
  /** Total HT de la ligne en centimes (= quantity × unitPrice). */
  lineTotalCents: number;
  /** Total de la facture en centimes (= total HT pour un micro en franchise). */
  totalCents: number;
  /** Montant dû en centimes (0 si facture acquittée). */
  duePayableCents: number;
  /** Conditions de paiement en texte libre, ex "Paiement à réception". */
  paymentTermsText?: string;
  /** IBAN pour les moyens de paiement (BIC optionnel). */
  iban?: string;
  bic?: string;
  /** Acquittée : aucun solde à régler. Affecte DuePayableAmount. */
  paid?: boolean;
  /** Type de document UN/CEFACT (UNTDID 1001) :
   *  - 380 = Commercial invoice (facture commerciale, défaut)
   *  - 381 = Commercial credit note (avoir / note de crédit)
   *  Norme EN 16931 : un avoir DOIT utiliser TypeCode 381 et avoir un montant
   *  négatif (ce que le PDF rend visuellement en valeur absolue). */
  documentTypeCode?: "380" | "381";
  /** Référence à la facture originale lorsque ce document est un avoir
   *  (TypeCode 381). Encodé dans BillingSpecifiedReferencedDocument pour la
   *  traçabilité comptable et la reconnaissance par les PDP. */
  relatedInvoiceNumber?: string;
  seller: {
    legalName: string;
    siren: string;
    vatId?: string;               // vide pour franchise en base
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
  };
  buyer: {
    name: string;
    siren?: string;
    addressLine1?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
  };
};

/**
 * Construit l'XML Factur-X profil BASIC conforme EN 16931.
 *
 * Compat : l'ancienne API `buildFacturxMinimumXml(input)` reste exportée
 * en alias pour ne pas casser les consommateurs existants — elle appelle
 * désormais le builder BASIC.
 */
export function buildFacturxBasicXml(inp: FacturxInput): string {
  const fmt = (cents: number) => (cents / 100).toFixed(2);
  const lineTotal = fmt(inp.lineTotalCents);
  const total = fmt(inp.totalCents);
  const due = fmt(inp.paid ? 0 : inp.duePayableCents);
  const unitPrice = fmt(inp.unitPriceCents);
  const qty = Number.isInteger(inp.quantity)
    ? String(inp.quantity)
    : inp.quantity.toFixed(2);

  const issuedCompact = inp.issuedOnIso.replace(/-/g, "");
  const dueCompact = inp.dueOnIso ? inp.dueOnIso.replace(/-/g, "") : "";
  const execCompact = (inp.executionDateIso ?? inp.issuedOnIso).replace(/-/g, "");

  const sellerCountry = inp.seller.countryCode || "FR";
  const buyerCountry = inp.buyer.countryCode || "FR";

  // BR-E-02 : pour une facture exonérée de TVA (CategoryCode=E), il faut
  // soit le VAT ID (BT-31), soit l'identifiant fiscal du vendeur (BT-32),
  // soit le VAT ID du représentant fiscal. Pour un AE en franchise en
  // base, on n'a PAS de VAT ID. On émet donc un SpecifiedTaxRegistration
  // avec schemeID="FC" (Tax Registration Code) en utilisant le SIREN
  // comme tax registration identifier — c'est le pattern recommandé par
  // FNFE-MPE pour les micros sans TVA.
  const sellerTaxRegistrationBlock = inp.seller.vatId
    ? `        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${esc(inp.seller.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
    : `        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${esc(inp.seller.siren)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`;

  const buyerSirenBlock = inp.buyer.siren
    ? `        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${esc(inp.buyer.siren)}</ram:ID>
        </ram:SpecifiedLegalOrganization>`
    : "";

  const buyerAddress =
    inp.buyer.addressLine1 || inp.buyer.postalCode || inp.buyer.city
      ? `        <ram:PostalTradeAddress>
          ${inp.buyer.postalCode ? `<ram:PostcodeCode>${esc(inp.buyer.postalCode)}</ram:PostcodeCode>` : ""}
          ${inp.buyer.addressLine1 ? `<ram:LineOne>${esc(inp.buyer.addressLine1)}</ram:LineOne>` : ""}
          ${inp.buyer.city ? `<ram:CityName>${esc(inp.buyer.city)}</ram:CityName>` : ""}
          <ram:CountryID>${esc(buyerCountry)}</ram:CountryID>
        </ram:PostalTradeAddress>`
      : "";

  // Payment means : 58 = SEPA credit transfer (virement). Inclut l'IBAN
  // si fourni.
  //
  // Limitations du profil BASIC :
  //  - `<ram:Information>` n'est PAS autorisé (réservé au profil EN16931+).
  //  - `<ram:PayeeSpecifiedCreditorFinancialInstitution>` (qui porte le
  //    BIC) n'est PAS non plus autorisé en BASIC. Le BIC arrive seulement
  //    à partir d'EN16931 (BT-86 dans la sémantique mais seulement
  //    encodable au profil supérieur).
  // On les omet ici pour passer la validation XSD stricte. Le BIC reste
  // visible côté PDF dans le bloc bancaire — c'est légalement suffisant.
  const paymentMeansBlock = inp.iban
    ? `      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${esc(cleanIban(inp.iban))}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>`
    : `      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
      </ram:SpecifiedTradeSettlementPaymentMeans>`;

  // Payment terms : BR-CO-25 exige soit DueDate (BT-9) soit Description
  // (BT-20) si le DuePayableAmount est positif. Pour rester safe on
  // émet TOUJOURS un block PaymentTerms avec au minimum une description
  // (fallback "À réception" pour les factures à régler, "Déjà réglée"
  // pour les acquittées).
  const paymentTermsDescription =
    inp.paymentTermsText?.trim() ||
    (inp.paid ? "Déjà réglée" : "Paiement à réception");
  const paymentTermsBlock = `      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${esc(paymentTermsDescription)}</ram:Description>${
          dueCompact && !inp.paid
            ? `
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueCompact}</udt:DateTimeString>
        </ram:DueDateDateTime>`
            : ""
        }
      </ram:SpecifiedTradePaymentTerms>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>A1</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(inp.number)}</ram:ID>
    <ram:TypeCode>${esc(inp.documentTypeCode ?? "380")}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issuedCompact}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(truncate(inp.description, 500))}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${unitPrice}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${qty}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>E</ram:CategoryCode>
          <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(inp.seller.legalName)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${esc(inp.seller.siren)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(inp.seller.postalCode)}</ram:PostcodeCode>
          <ram:LineOne>${esc(inp.seller.addressLine1)}</ram:LineOne>
          <ram:CityName>${esc(inp.seller.city)}</ram:CityName>
          <ram:CountryID>${esc(sellerCountry)}</ram:CountryID>
        </ram:PostalTradeAddress>
${sellerTaxRegistrationBlock}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(inp.buyer.name)}</ram:Name>
${buyerSirenBlock}
${buyerAddress}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${execCompact}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(inp.number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${esc(inp.currency)}</ram:InvoiceCurrencyCode>
${paymentMeansBlock}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>
        <ram:BasisAmount>${total}</ram:BasisAmount>
        <ram:CategoryCode>E</ram:CategoryCode>
        <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
${paymentTermsBlock}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${lineTotal}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${total}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(inp.currency)}">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${total}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${due}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>${
        inp.documentTypeCode === "381" && inp.relatedInvoiceNumber
          ? `
      <ram:InvoiceReferencedDocument>
        <ram:IssuerAssignedID>${esc(inp.relatedInvoiceNumber)}</ram:IssuerAssignedID>
      </ram:InvoiceReferencedDocument>`
          : ""
      }
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

/**
 * Alias rétro-compat. L'app l'appelle encore sous ce nom et reçoit désormais
 * du BASIC (même fichier de sortie, même filename "factur-x.xml" attendu
 * par les parsers — seul le contenu XML est enrichi).
 */
export const buildFacturxMinimumXml = buildFacturxBasicXml;

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[c]!));
}

function cleanIban(s: string) {
  return (s || "").replace(/\s+/g, "").toUpperCase();
}

function cleanBic(s: string) {
  return (s || "").replace(/\s+/g, "").toUpperCase();
}

function truncate(s: string, max: number) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
