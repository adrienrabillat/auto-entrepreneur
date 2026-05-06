import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseInvoiceImport } from "@/lib/import-invoices";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/import
 *
 * Import en masse de factures historiques venant d'un autre logiciel.
 * Body : multipart/form-data avec un champ "file" (CSV ou XLSX).
 *
 * Comportement :
 *   - Parse le fichier (lib/import-invoices.ts) avec validation stricte.
 *   - En cas d'erreur de parsing → renvoie 400 avec la liste des erreurs.
 *   - Sinon → tente l'insert en bulk avec imported=true.
 *   - Si une contrainte unique (user_id, number) saute → la facture
 *     existe déjà (importée précédemment) → on la skippe et on remonte
 *     un warning. Le reste continue.
 *
 * Ces factures :
 *   - N'allouent PAS de numéro depuis invoice_number_seed (le numéro vient
 *     du CSV, on le préserve tel quel pour la cohérence avec l'autre logiciel).
 *   - NE seront PAS soumises à l'URSSAF (declaration-service les exclut
 *     via WHERE imported = false).
 *   - SONT incluses dans le calcul du seuil annuel et l'export Excel.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body multipart invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni dans le champ 'file'." }, { status: 400 });
  }

  // Garde-fou taille : un import massif ne devrait pas dépasser 5 Mo en
  // pratique (un AE n'a pas 50 000 factures à importer).
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max 5 Mo).` },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = await parseInvoiceImport(file.name, bytes);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Erreurs de validation", validation: parsed.errors },
      { status: 400 }
    );
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne valide dans le fichier." },
      { status: 400 }
    );
  }

  // Construction du payload bulk. Tous les champs Asthia obligatoires
  // sont remplis à partir des données parsées + valeurs par défaut.
  const importedAt = new Date().toISOString();
  const payload = parsed.rows.map((r) => ({
    user_id: user.id,
    number: r.number,
    description: r.description,
    quantity: 1,
    unit_price_cents: r.amount_cents,
    amount_cents: r.amount_cents,
    currency: "EUR",
    operation_type: r.operation_type,
    client_email: r.client_email,
    client_name: r.client_name,
    issued_on: r.issued_on,
    paid_at: r.paid_at,
    sent_at: r.paid_at ?? r.issued_on, // approximation : au pire = jour d'émission
    status: r.status,
    discount_terms: "Néant",
    invoice_type: "standard",
    imported: true,
    imported_at: importedAt,
    import_source: file.name,
  }));

  // Insertion bulk. Sur conflit (user_id, number), on skip la ligne (on
  // ne re-importe pas une facture déjà présente) — Supabase ne supporte pas
  // ON CONFLICT DO NOTHING en upsert, donc on fait l'insert simple et on
  // récupère la liste des conflits pour les remonter en warning.
  const { data: inserted, error: insertErr } = await supabase
    .from("invoices")
    .insert(payload)
    .select("id, number");

  if (insertErr) {
    // Si c'est un 23505 sur (number), on retombe sur un mode "ligne par
    // ligne" pour insérer ce qui peut l'être et remonter les doublons.
    const code = (insertErr as { code?: string }).code;
    if (code !== "23505") {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    return await insertOneByOne(supabase, user.id, payload, file.name, parsed.warnings);
  }

  return NextResponse.json({
    ok: true,
    imported: inserted?.length ?? 0,
    warnings: parsed.warnings,
  });
}

/**
 * Fallback : on insère ligne par ligne et on collecte les conflits.
 * Permet à un AE qui re-uploade le même fichier d'insérer uniquement les
 * nouveautés sans avoir à curer son fichier à la main.
 */
async function insertOneByOne(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>[],
  source: string,
  parseWarnings: { row: number; field: string; message: string }[],
) {
  let imported = 0;
  const skipped: { number: string; reason: string }[] = [];
  for (const row of payload) {
    const { error } = await supabase.from("invoices").insert(row);
    if (!error) {
      imported++;
      continue;
    }
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      skipped.push({
        number: String(row.number),
        reason: "Numéro déjà présent dans Asthia (déjà importé ou conflit avec une facture émise).",
      });
    } else {
      // Erreur autre que conflit unique : on remonte tout, sans inserer le reste
      // (situation anormale).
      return NextResponse.json(
        {
          error: error.message,
          imported,
          source,
        },
        { status: 500 }
      );
    }
  }
  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    warnings: parseWarnings,
  });
}
