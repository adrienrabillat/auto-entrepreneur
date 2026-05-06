/**
 * Parser pour l'import de factures historiques (Sprint 4 — #12b).
 *
 * Accepte deux formats :
 *   - CSV : séparateur virgule ou point-virgule, première ligne = en-têtes.
 *   - XLSX : première feuille, première ligne = en-têtes (via ExcelJS).
 *
 * Colonnes attendues (en-têtes insensibles à la casse, accents acceptés
 * dans les variantes courantes) :
 *
 *   numero            (req)  ex: "F-2024-0042"
 *   date_emission     (req)  ex: "2024-03-15" ou "15/03/2024"
 *   date_encaissement (opt)  ex: "2024-04-02" — si présent et statut=paid
 *   client_email      (req)  ex: "client@exemple.fr"
 *   client_name       (opt)  ex: "Jean Dupont"
 *   description       (req)  ex: "Prestation de coaching mars 2024"
 *   montant_ht        (req)  ex: "1500" ou "1500,00" ou "1 500.00 €"
 *   statut            (opt)  "paid" | "sent" — défaut "paid"
 *   operation_type    (opt)  "service" | "vente" | "mixte" — défaut "service"
 *
 * Le parser est strict : toute erreur de format sur une ligne est remontée
 * et bloque l'import du lot complet (transaction tout ou rien). Pas
 * d'auto-correction silencieuse.
 */

import ExcelJS from "exceljs";

export type ParsedInvoiceRow = {
  /** Numéro de facture tel qu'il était dans l'autre logiciel. Stocké tel
   *  quel dans `invoices.number` (l'unicité user+number est appliquée par
   *  la contrainte BD ; les doublons remontent en erreur). */
  number: string;
  /** Date d'émission ISO (YYYY-MM-DD). */
  issued_on: string;
  /** Date d'encaissement ISO ou null. Si statut=paid et null, on retombe
   *  sur issued_on. */
  paid_at: string | null;
  client_email: string;
  client_name: string | null;
  description: string;
  /** Montant HT en centimes (entier positif). */
  amount_cents: number;
  /** Si l'utilisateur dit "paid" → status='paid', sinon 'sent'. */
  status: "paid" | "sent";
  operation_type: "service" | "vente" | "mixte";
  /** Index 1-based de la ligne dans le fichier source (pour les messages
   *  d'erreur "ligne 12 : montant invalide"). */
  sourceRowIndex: number;
};

export type ImportError = {
  row: number;       // 1-based, sans compter l'en-tête
  field: string;
  message: string;
  raw?: string;
};

export type ImportResult =
  | { ok: true; rows: ParsedInvoiceRow[]; warnings: ImportError[] }
  | { ok: false; errors: ImportError[]; rows?: undefined };

// Map { variantes en-tête → clé canonique }. Insensible à la casse, on
// normalise en lowercase + retrait accents avant lookup.
const HEADER_ALIASES: Record<string, string> = {
  // numero
  numero: "number", "n° facture": "number", "numero facture": "number", "num facture": "number",
  // date emission
  "date emission": "issued_on", "date d'emission": "issued_on", "date_emission": "issued_on",
  date: "issued_on",
  // date encaissement
  "date encaissement": "paid_at", "date_encaissement": "paid_at",
  "date paiement": "paid_at", "date payee": "paid_at", "payee le": "paid_at",
  // client
  "client email": "client_email", client_email: "client_email", email: "client_email",
  "client name": "client_name", client_name: "client_name", "nom client": "client_name", client: "client_name",
  // description
  description: "description", "descr": "description", "objet": "description", "libelle": "description",
  // montant
  "montant ht": "amount", "montant_ht": "amount", "total ht": "amount", "montant": "amount",
  "total": "amount", "amount": "amount",
  // statut
  statut: "status", status: "status",
  // type opération
  "operation_type": "operation_type", "operation type": "operation_type", "nature": "operation_type",
  type: "operation_type",
};

const REQUIRED_FIELDS: Array<keyof ParsedInvoiceRow | "amount"> = [
  "number",
  "issued_on",
  "client_email",
  "description",
  "amount",
];

/**
 * Détecte le format à partir du nom de fichier + premier byte. Renvoie
 * "xlsx" pour les fichiers Office, "csv" sinon.
 */
function detectFormat(filename: string, head: Uint8Array): "xlsx" | "csv" {
  if (filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")) return "xlsx";
  // Magic number ZIP (xlsx = zip) : PK\003\004
  if (head[0] === 0x50 && head[1] === 0x4b) return "xlsx";
  return "csv";
}

/**
 * Parse un fichier (CSV ou XLSX) en tableau de ParsedInvoiceRow.
 */
export async function parseInvoiceImport(
  filename: string,
  bytes: Uint8Array,
): Promise<ImportResult> {
  const fmt = detectFormat(filename, bytes.slice(0, 4));
  const rawRows = fmt === "xlsx" ? await parseXlsx(bytes) : parseCsv(bytes);
  if (rawRows.length === 0) {
    return { ok: false, errors: [{ row: 0, field: "file", message: "Fichier vide ou illisible." }] };
  }

  // Première ligne = en-têtes. On les normalise et on les mappe vers les
  // clés canoniques.
  const headerRow = rawRows[0].map((c) => normalizeHeader(c));
  const headerMap: Record<number, string> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = HEADER_ALIASES[headerRow[i]];
    if (key) headerMap[i] = key;
  }

  // Vérifier que toutes les colonnes requises sont présentes.
  const presentCanonical = new Set(Object.values(headerMap));
  const missing = REQUIRED_FIELDS.filter((f) => !presentCanonical.has(f));
  if (missing.length > 0) {
    return {
      ok: false,
      errors: [
        {
          row: 1,
          field: "headers",
          message: `Colonnes manquantes : ${missing.join(", ")}. En-têtes attendus : numero, date_emission, client_email, description, montant_ht.`,
        },
      ],
    };
  }

  // Parsing ligne par ligne.
  const rows: ParsedInvoiceRow[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  const seenNumbers = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (raw.every((c) => !c?.trim())) continue; // ligne vide → skip

    const get = (canonical: string): string => {
      for (const [colIdx, mapped] of Object.entries(headerMap)) {
        if (mapped === canonical) return (raw[Number(colIdx)] ?? "").trim();
      }
      return "";
    };

    const sourceRow = i + 1; // index 1-based en partant de 0 = en-tête
    const number = get("number");
    if (!number) {
      errors.push({ row: sourceRow, field: "numero", message: "Numéro de facture manquant." });
      continue;
    }
    if (seenNumbers.has(number)) {
      errors.push({
        row: sourceRow,
        field: "numero",
        message: `Numéro en double dans le fichier : ${number}`,
      });
      continue;
    }
    seenNumbers.add(number);

    const issuedOnRaw = get("issued_on");
    const issuedOn = parseDate(issuedOnRaw);
    if (!issuedOn) {
      errors.push({
        row: sourceRow,
        field: "date_emission",
        message: `Date d'émission invalide. Formats acceptés : YYYY-MM-DD, DD/MM/YYYY.`,
        raw: issuedOnRaw,
      });
      continue;
    }

    const paidAtRaw = get("paid_at");
    const paidAt = paidAtRaw ? parseDate(paidAtRaw) : null;
    if (paidAtRaw && !paidAt) {
      warnings.push({
        row: sourceRow,
        field: "date_encaissement",
        message: `Date d'encaissement invalide, ignorée.`,
        raw: paidAtRaw,
      });
    }

    const clientEmail = get("client_email").toLowerCase();
    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      errors.push({
        row: sourceRow,
        field: "client_email",
        message: "Email client invalide.",
        raw: clientEmail,
      });
      continue;
    }

    const description = get("description");
    if (!description) {
      errors.push({ row: sourceRow, field: "description", message: "Description manquante." });
      continue;
    }

    const amountRaw = get("amount");
    const amountCents = parseAmountCents(amountRaw);
    if (amountCents === null || amountCents <= 0) {
      errors.push({
        row: sourceRow,
        field: "montant_ht",
        message: "Montant invalide (doit être > 0).",
        raw: amountRaw,
      });
      continue;
    }

    const statusRaw = get("status").toLowerCase();
    const status: "paid" | "sent" =
      statusRaw === "sent" || statusRaw === "envoyée" || statusRaw === "envoyee"
        ? "sent"
        : "paid";

    const opRaw = get("operation_type").toLowerCase();
    const operation_type: "service" | "vente" | "mixte" =
      opRaw === "vente" ? "vente" : opRaw === "mixte" ? "mixte" : "service";

    rows.push({
      number,
      issued_on: issuedOn,
      paid_at: status === "paid" ? paidAt ?? issuedOn : null,
      client_email: clientEmail,
      client_name: get("client_name") || null,
      description,
      amount_cents: amountCents,
      status,
      operation_type,
      sourceRowIndex: sourceRow,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows, warnings };
}

/**
 * Normalise un en-tête : minuscules, sans accents, espaces simples.
 */
function normalizeHeader(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    // Strip combining diacritical marks (U+0300..U+036F).
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse un montant tolérant. Accepte "1500", "1500,00", "1 500.00", "1500 €".
 * Retourne le montant en centimes (Math.round) ou null si non-parsable.
 */
function parseAmountCents(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/,/g, ".");
  const f = parseFloat(cleaned);
  if (!Number.isFinite(f)) return null;
  return Math.round(f * 100);
}

/**
 * Parse une date en deux formats : YYYY-MM-DD (ISO) ou DD/MM/YYYY (FR).
 * Retourne ISO YYYY-MM-DD ou null si invalide.
 */
function parseDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  // ISO
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    return validDate(+y, +m, +d) ? `${y}-${m}-${d}` : null;
  }
  // FR DD/MM/YYYY ou DD-MM-YYYY
  const fr = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (fr) {
    const [, d, m, y] = fr;
    if (!validDate(+y, +m, +d)) return null;
    return `${y}-${pad(+m)}-${pad(+d)}`;
  }
  return null;
}

function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parse un CSV simple. Détecte la séparateur (',' ou ';') sur la première
 * ligne. Pas de support des champs entre guillemets multi-lignes — on
 * reste sur le 80% des cas et on documente la limite (l'AE peut convertir
 * en XLSX pour les cas exotiques).
 */
function parseCsv(bytes: Uint8Array): string[][] {
  const text = new TextDecoder("utf-8").decode(bytes);
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  return lines.map((ln) => parseCsvLine(ln, sep));
}

/**
 * Parse une ligne CSV en respectant les guillemets simples. Pas de support
 * des champs multi-lignes (limite documentée).
 */
function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === sep) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Lit la première feuille d'un XLSX et renvoie le tableau ligne × colonne.
 */
async function parseXlsx(bytes: Uint8Array): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // row.values est 1-indexed (la position 0 est null) — on saute.
    const values = row.values as Array<unknown>;
    for (let i = 1; i < values.length; i++) {
      const v = values[i];
      if (v == null) cells.push("");
      else if (typeof v === "string") cells.push(v);
      else if (typeof v === "number") cells.push(String(v));
      else if (v instanceof Date) {
        // ExcelJS donne des Date pour les cellules date. On les rend en ISO.
        const d = v;
        cells.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      } else if (typeof v === "object" && v !== null && "text" in (v as object)) {
        // Rich text {richText: [...]} ou {text: "..."}
        const rich = v as { text?: string; richText?: { text: string }[] };
        cells.push(rich.text ?? rich.richText?.map((r) => r.text).join("") ?? "");
      } else {
        cells.push(String(v));
      }
    }
    out.push(cells);
  });
  return out;
}
