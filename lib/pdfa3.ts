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
import fs from "fs";
import path from "path";

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
 * Attache le XML Factur-X au PDF en construisant le Filespec
 * MANUELLEMENT (au lieu d'utiliser `pdf.attach()` de pdf-lib).
 *
 * Pourquoi ? `pdf.attach()` ne supporte pas le champ `/AFRelationship`,
 * qui est OBLIGATOIRE pour PDF/A-3 + Factur-X. Toute tentative de muter
 * le Filespec après attach (en allant le chercher dans /Names/EmbeddedFiles)
 * échoue silencieusement à la sérialisation — pdf-lib réécrit le dict
 * sans nos modifications. La seule façon fiable est de construire le
 * Filespec NOUS-MÊMES avec /AFRelationship dès le départ.
 *
 * Le Filespec final ressemble à :
 *   <<
 *     /Type /Filespec
 *     /F (factur-x.xml)
 *     /UF (factur-x.xml)
 *     /AFRelationship /Alternative
 *     /Desc (Factur-X (BASIC profile, EN 16931) ...)
 *     /EF << /F <stream> /UF <stream> >>
 *   >>
 */
export async function attachFacturxXml(
  pdf: PDFDocument,
  xmlBytes: Uint8Array,
  filename: string,
  description: string,
) {
  // 1. Stream du fichier embarqué (le XML lui-même), avec mimetype et
  //    Params/Size (recommandé par ISO 32000-2 §7.11).
  const efDictParams = pdf.context.obj({
    Size: xmlBytes.length,
    CheckSum: PDFString.of(""),
  });
  const efStream = PDFRawStream.of(
    pdf.context.obj({
      Type: "EmbeddedFile",
      Subtype: "application/xml",
      Length: xmlBytes.length,
      Params: efDictParams,
    }),
    xmlBytes,
  );
  const efStreamRef = pdf.context.register(efStream);

  // 2. Filespec : pointe vers le stream + porte la métadonnée AFRelationship.
  const filespec = pdf.context.obj({
    Type: "Filespec",
    F: PDFString.of(filename),
    UF: PDFHexString.fromText(filename),
    AFRelationship: PDFName.of("Alternative"),
    Desc: PDFString.of(description),
    EF: pdf.context.obj({
      F: efStreamRef,
      UF: efStreamRef,
    }),
  });
  const filespecRef = pdf.context.register(filespec);

  // 3. Inscription dans le name tree /Names/EmbeddedFiles/Names.
  //    Création de l'arbre s'il n'existe pas (cas d'un PDF neuf).
  const root = pdf.catalog;
  const names = ensureDict(root, PDFName.of("Names"), pdf);
  const ef = ensureDict(names, PDFName.of("EmbeddedFiles"), pdf);
  const efNamesArr = ensureArray(ef, PDFName.of("Names"), pdf);
  efNamesArr.push(PDFString.of(filename));
  efNamesArr.push(filespecRef);

  // 4. /AF sur le Catalog : array contenant les refs des Filespecs.
  //    Si déjà présent, on append ; sinon on crée.
  const afArr = ensureArray(root, PDFName.of("AF"), pdf);
  afArr.push(filespecRef);
}

/**
 * Helpers : récupère ou crée un sous-dictionnaire / sous-array d'un dict
 * PDF. Utile pour construire le name tree des EmbeddedFiles incrémentalement.
 */
function ensureDict(parent: PDFDict, key: PDFName, pdf: PDFDocument): PDFDict {
  const existing = parent.lookup(key);
  if (existing instanceof PDFDict) return existing;
  const created = pdf.context.obj({});
  parent.set(key, created);
  return created;
}

function ensureArray(parent: PDFDict, key: PDFName, pdf: PDFDocument): PDFArray {
  const existing = parent.lookup(key);
  if (existing instanceof PDFArray) return existing;
  const created = pdf.context.obj([]);
  parent.set(key, created);
  return created;
}

/**
 * Applique les modifications PDF/A-3 + Factur-X au document. À appeler
 * APRÈS l'attach du factur-x.xml mais AVANT le `pdf.save()`.
 *
 * Tout ce qui se passe ici est défensif : si une étape échoue (par
 * exemple parce que la structure interne du PDF a changé entre versions
 * de pdf-lib), on log et on continue. La conformité PDF/A-3 est un
 * "nice to have" — perdre la facture entière à cause de métadonnées
 * cassées serait pire.
 */
export function applyPdfA3FacturxCompliance(pdf: PDFDocument, opts: FacturxOptions) {
  // Note : l'AFRelationship est désormais set au moment de l'attach
  // (cf. `attachFacturxXml`), donc plus besoin de le faire ici.
  try {
    attachOutputIntent(pdf);
  } catch (e) {
    console.warn("[pdfa3] attachOutputIntent failed:", e);
  }
  try {
    attachXmpMetadata(pdf, opts);
  } catch (e) {
    console.warn("[pdfa3] attachXmpMetadata failed:", e);
  }
}

/**
 * Ajoute un /OutputIntents au Catalog avec un profil ICC sRGB embarqué.
 *
 * PDF/A-3 exige cette déclaration colorimétrique pour que le rendu des
 * couleurs soit reproductible à long terme. Sans ça, veraPDF marque le
 * PDF comme non conforme. Acrobat l'affiche correctement quand même mais
 * on n'est pas en règle au sens strict.
 *
 * Le profil sRGB est stocké en `lib/assets/sRGB.icc` (~480 bytes, profil
 * "sRGB v2 micro" — minimum valide pour PDF/A). Il est lu une fois et
 * mis en cache module-level.
 */
let cachedIccBytes: Uint8Array | null | undefined;

function loadSrgbIcc(): Uint8Array | null {
  if (cachedIccBytes !== undefined) return cachedIccBytes;
  try {
    // process.cwd() pointe vers la racine de l'app sur Vercel
    // serverless. Le profil est inclus via `outputFileTracingIncludes`
    // dans next.config.js.
    const filePath = path.join(process.cwd(), "lib", "assets", "sRGB.icc");
    cachedIccBytes = new Uint8Array(fs.readFileSync(filePath));
    return cachedIccBytes;
  } catch (e) {
    console.warn(
      "[pdfa3] sRGB.icc introuvable à",
      path.join(process.cwd(), "lib/assets/sRGB.icc"),
      "—",
      e instanceof Error ? e.message : e,
    );
    cachedIccBytes = null;
    return null;
  }
}

function attachOutputIntent(pdf: PDFDocument) {
  const iccBytes = loadSrgbIcc();
  if (!iccBytes) return;

  // Embed du profil ICC en stream avec /N=3 (RGB = 3 composantes).
  const iccStream = PDFRawStream.of(
    pdf.context.obj({
      N: 3,
      Length: iccBytes.length,
    }),
    iccBytes,
  );
  const iccRef = pdf.context.register(iccStream);

  // Construit l'objet OutputIntent qui référence le profil.
  // - S = GTS_PDFA1 (signature historique reprise par PDF/A-3)
  // - OutputConditionIdentifier = "sRGB IEC61966-2.1" (chaîne libre,
  //   doit matcher la sémantique du profil ICC)
  // - DestOutputProfile = ref vers notre stream ICC
  const outputIntent = pdf.context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFA1",
    OutputConditionIdentifier: PDFString.of("sRGB IEC61966-2.1"),
    OutputCondition: PDFString.of("sRGB"),
    Info: PDFString.of("sRGB IEC61966-2.1"),
    DestOutputProfile: iccRef,
  });
  const outputIntentRef = pdf.context.register(outputIntent);

  // Le Catalog contient un /OutputIntents qui est un array de un ou
  // plusieurs OutputIntent. PDF/A demande au moins un.
  pdf.catalog.set(
    PDFName.of("OutputIntents"),
    pdf.context.obj([outputIntentRef]),
  );
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
