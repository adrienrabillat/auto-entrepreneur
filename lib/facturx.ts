/**
 * Factur-X (MINIMUM profile) — CII D16B XML generator.
 *
 * Factur-X is the French/German hybrid electronic invoice format mandated for
 * B2B use in France (receiving: 1 Sept 2026 / emitting for TPE & micro-
 * entrepreneurs: 1 Sept 2027). It's a PDF/A-3 file with an embedded XML
 * (UN/CEFACT Cross Industry Invoice, syntax D16B, EN 16931 semantic model).
 *
 * The MINIMUM profile carries only the data strictly required for the central
 * e-reporting (Portail Public de Facturation): parties identification (SIREN),
 * invoice number & date, totals. It's fully accepted by the French PPF and is
 * the pragmatic choice for non-VAT-registered auto-entrepreneurs who don't
 * need the rich VAT breakdown of BASIC / EN16931 profiles.
 *
 * Spec reference: https://fnfe-mpe.org/factur-x/
 */

export type FacturxInput = {
  number: string;                 // "2026-0001"
  issuedOnIso: string;            // YYYY-MM-DD
  currency: string;               // "EUR"
  totalCents: number;             // total TTC (= total HT for an auto-entrepreneur in franchise en base)
  seller: {
    legalName: string;            // "Jeanne Dupont" (the EI mention goes in the PDF visual part, not the XML)
    siren: string;                // 9 digits
    vatId?: string;               // not applicable for franchise-en-base — leave empty
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;          // "FR"
  };
  buyer: {
    name: string;
    siren?: string;               // 9 digits if B2B
    addressLine1?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;         // defaults to "FR"
  };
};

export function buildFacturxMinimumXml(inp: FacturxInput): string {
  // Format cents as a plain decimal number with 2 decimals
  const amount = (inp.totalCents / 100).toFixed(2);
  const issuedCompact = inp.issuedOnIso.replace(/-/g, ""); // YYYYMMDD as required by CII format 102

  const sellerCountry = inp.seller.countryCode || "FR";
  const buyerCountry = inp.buyer.countryCode || "FR";

  const sellerVatBlock = inp.seller.vatId
    ? `        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${esc(inp.seller.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
    : "";

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
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(inp.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issuedCompact}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
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
${sellerVatBlock}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(inp.buyer.name)}</ram:Name>
${buyerSirenBlock}
${buyerAddress}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${esc(inp.currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>${amount}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(inp.currency)}">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amount}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${amount}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[c]!));
}
