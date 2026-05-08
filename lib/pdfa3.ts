import {
  PDFArray,
  PDFDocument,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
} from "pdf-lib";

/**
 * Conformité Factur-X / PDF/A-3.
 *
 * Cette lib applique les transformations PDF nécessaires pour qu'une
 * facture sortie de pdf-lib soit reconnue comme un PDF/A-3 BASIC valide
 * portant un payload Factur-X CII.
 *
 * Référence : ISO 19005-3 (PDF/A-3) + spec Factur-X 1.0.07.
 *
 * Ce qu'on couvre :
 *  - Métadonnées XMP au niveau du document (`/Metadata` sur le Catalog),
 *    incluant la déclaration PDF/A-3 part=3, conformance=B, ET l'extension
 *    schema Factur-X (DocumentType=INVOICE, Version=1.0,
 *    ConformanceLevel=BASIC, DocumentFileName=factur-x.xml).
 *  - `/AFRelationship` sur le Filespec de l'attachment (valeur
 *    `/Alternative` requise par Factur-X pour signaler que le XML est
 *    une représentation alternative du contenu visible du PDF).
 *  - Tag du PDF en version 1.7 (Factur-X exige ≥ 1.7).
 *
 * Ce qui reste à faire (TODO) :
 *  - `/OutputIntents` avec un profil ICC sRGB embarqué. PDF/A-3 l'exige
 *    pour décrire l'espace colorimétrique de référence du PDF. Sans cela,
 *    un validator strict (veraPDF) signalera une non-conformité, même si
 *    Acrobat/Foxit affichent souvent le PDF comme valide quand même.
 *    Plan : bundler `lib/assets/sRGB.icc` (≈3 KB), le lire au runtime,
 *    l'embed comme stream + ajouter l'OutputIntent au Catalog.
 */

export type FacturxOptions = {
  /** Nom du fichier XML attaché — toujours `factur-x.xml` selon la spec. */
  facturxFileName: string;
  /** Niveau de conformité Factur-X. Pour l'instant on génère du BASIC. */
  conformanceLevel: "MINIMUM" | "BASIC WL" | "BASIC" | "EN 16931" | "EXTENDED";
  /** Type de document — INVOICE pour facture/avoir, autres si besoin. */
  documentType: "INVOICE" | "ORDER" | "OTHER";
  /** Date d'émission au format ISO (utilisée dans le XMP). */
  issuedAtIso: string;
  /** Sujet humain du PDF (utilisé dans le XMP `dc:title`/`dc:description`). */
  title: string;
  description: string;
  author: string;
};

/**
 * Applique les modifications PDF/A-3 + Factur-X au document. À appeler
 * APRÈS l'attach du factur-x.xml mais AVANT le `pdf.save()`.
 */
export function applyPdfA3FacturxCompliance(pdf: PDFDocument, opts: FacturxOptions) {
  // 1. Tag version 1.7 (Factur-X requiert ≥ 1.7).
  // pdf-lib n'expose pas de setter direct, mais on peut écrire dans le
  // header en éditant pdf.context.header. Si non disponible, le default
  // de pdf-lib (1.7) suffit déjà.

  // 2. AFRelationship sur le Filespec de chaque pièce jointe.
  setAfRelationshipOnFilespecs(pdf, "Alternative");

  // 3. XMP metadata sur le Catalog.
  attachXmpMetadata(pdf, opts);
}

/**
 * Parcourt les pièces jointes embarquées (`/Names/EmbeddedFiles`) et
 * définit `/AFRelationship` sur leur Filespec. Crée aussi (ou maintient)
 * l'array `/AF` sur le Catalog pointant vers ces Filespecs — ce qui
 * permet à un lecteur PDF de découvrir les attachments associés sans
 * fouiller dans Names.
 */
function setAfRelationshipOnFilespecs(pdf: PDFDocument, relationship: string) {
  const root = pdf.catalog;
  const names = root.lookup(PDFName.of("Names"), PDFDict);
  if (!names) return;
  const ef = names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
  if (!ef) return;
  const namesArr = ef.lookup(PDFName.of("Names"), PDFArray);
  if (!namesArr) return;

  const filespecRefs: PDFRef[] = [];
  for (let i = 1; i < namesArr.size(); i += 2) {
    // Le Names array est un tableau plat [name1, value1, name2, value2,...].
    // Les "value" sont des Filespec — on récupère leur ref pour pouvoir
    // les ajouter à `/AF` du catalog, et on fait un lookup pour pouvoir
    // muter leur AFRelationship.
    const raw = namesArr.get(i);
    let spec: PDFDict | undefined;
    let ref: PDFRef | undefined;
    if (raw instanceof PDFRef) {
      ref = raw;
      const dereffed = pdf.context.lookup(raw);
      if (dereffed instanceof PDFDict) spec = dereffed;
    } else if (raw instanceof PDFDict) {
      spec = raw;
    }
    if (!spec) continue;
    spec.set(PDFName.of("AFRelationship"), PDFName.of(relationship));
    if (ref) filespecRefs.push(ref);
  }

  if (filespecRefs.length > 0) {
    // Ajoute l'array /AF sur le catalog. Si une /AF existe déjà, on
    // l'écrase avec celle qui est correctement construite ici.
    root.set(PDFName.of("AF"), pdf.context.obj(filespecRefs));
  }
}

/**
 * Génère et attache le XMP metadata stream au Catalog (`/Metadata`).
 * Inclut les déclarations PDF/A-3 part=3 conformance=B, l'extension
 * schema Factur-X, et les champs Dublin Core / xmp standard pour la
 * lisibilité.
 */
function attachXmpMetadata(pdf: PDFDocument, opts: FacturxOptions) {
  const xmp = buildXmpPacket(opts);
  const xmpBytes = new TextEncoder().encode(xmp);
  const stream = PDFRawStream.of(
    pdf.context.obj({
      Type: "Metadata",
      Subtype: "XML",
      Length: xmpBytes.length,
    }),
    xmpBytes,
  );
  const ref = pdf.context.register(stream);
  pdf.catalog.set(PDFName.of("Metadata"), ref);
  // Suppress lint warnings for unused imports.
  void PDFHexString;
  void PDFString;
}

/**
 * Construit le packet XMP complet conforme à PDF/A-3 + extension Factur-X.
 *
 * Structure :
 *  - en-tête `<?xpacket … ?>` avec BOM optionnel
 *  - `<x:xmpmeta>` racine
 *  - `<rdf:RDF>` avec plusieurs `<rdf:Description>` :
 *    1. PDF/A identification (pdfaid:part, pdfaid:conformance)
 *    2. Factur-X extension (fx:DocumentFileName, fx:DocumentType,
 *       fx:Version, fx:ConformanceLevel)
 *    3. Schema definition pour l'extension Factur-X (pdfaExtension:schemas)
 *       — c'est une obligation PDF/A pour tout namespace non standard.
 *    4. Dublin Core (dc:title, dc:creator, dc:description)
 *    5. XMP basic (xmp:CreateDate, xmp:CreatorTool)
 *    6. PDF (pdf:Producer)
 */
function buildXmpPacket(opts: FacturxOptions): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const date = opts.issuedAtIso;

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="auto-entrepreneur app">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">

    <!-- 1. PDF/A identification : on annonce part=3 (PDF/A-3), conformance=B (visual + structured). -->
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>

    <!-- 2. Factur-X extension namespace : indique aux lecteurs qu'un
         payload structuré CII est attaché et où le trouver. -->
    <rdf:Description rdf:about=""
        xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>${safe(opts.documentType)}</fx:DocumentType>
      <fx:DocumentFileName>${safe(opts.facturxFileName)}</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>${safe(opts.conformanceLevel)}</fx:ConformanceLevel>
    </rdf:Description>

    <!-- 3. Description du schema d'extension Factur-X — exigence PDF/A
         pour tout namespace non standard. Sans ce bloc, veraPDF
         considère le PDF comme non conforme PDF/A-3. -->
    <rdf:Description rdf:about=""
        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>INVOICE</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The conformance level of the embedded XML</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>

    <!-- 4. Dublin Core — identité humaine du document. -->
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safe(opts.title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${safe(opts.author)}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safe(opts.description)}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>

    <!-- 5. XMP basic. -->
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${safe(date)}</xmp:CreateDate>
      <xmp:ModifyDate>${safe(date)}</xmp:ModifyDate>
      <xmp:CreatorTool>auto-entrepreneur app</xmp:CreatorTool>
    </rdf:Description>

    <!-- 6. PDF metadata. -->
    <rdf:Description rdf:about=""
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>auto-entrepreneur app</pdf:Producer>
    </rdf:Description>

  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
