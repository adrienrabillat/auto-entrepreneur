import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/profile/logo
 *
 * Upload du logo de l'AE — stocké dans le bucket Storage `logos` sous le
 * path `<user_id>/logo.<ext>`. Le path est ensuite persisté dans
 * `profiles.logo_path` pour qu'on puisse l'embed sur les PDF factures/devis.
 *
 * Contraintes :
 *  - Image uniquement (PNG, JPG, WebP, SVG)
 *  - Taille max 2 Mo (le PDF de Factur-X embed l'image, on évite les fichiers
 *    trop lourds qui gonfleraient chaque facture).
 *  - Un seul logo par AE (upsert).
 *
 * DELETE /api/profile/logo
 *
 * Supprime le logo (storage + DB) si l'AE veut revenir à un PDF sans logo.
 */

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier reçu (champ 'file' attendu)" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error:
          "Format non supporté. Utilise PNG, JPG, WebP ou SVG.",
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(2)} Mo > 2 Mo)` },
      { status: 413 },
    );
  }

  // Extension : on déduit du content-type pour ne pas dépendre du nom
  // d'origine (qui peut être "image.bin" ou autre).
  const ext = ({
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  } as Record<string, string>)[file.type];

  const path = `${user.id}/logo.${ext}`;

  // upsert: true → écrase l'ancien logo (un seul par AE). Si le précédent
  // avait une autre extension, il reste en orphan dans Storage — ce n'est
  // pas grave (quelques Ko) mais on pourrait nettoyer en deletant tous les
  // logo.* avant l'upload si on devient pointilleux.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("logos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (upErr) {
    console.error("[profile/logo] upload failed:", upErr);
    return NextResponse.json(
      { error: `Upload storage : ${upErr.message}` },
      { status: 500 },
    );
  }

  // On stocke aussi le content-type pour pouvoir servir l'image ensuite
  // sans avoir à le redéduire de l'extension. Mais comme on n'a pas de
  // colonne dédiée, on encode dans le path lui-même (seule l'extension
  // varie déjà selon le type). C'est suffisant.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ logo_path: path })
    .eq("id", user.id);

  if (profileErr) {
    return NextResponse.json(
      { error: `Mise à jour profil : ${profileErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, path });
}

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // On retrouve le path stocké, on remove du Storage, on clear la colonne.
  const { data: profile } = await supabase
    .from("profiles")
    .select("logo_path")
    .eq("id", user.id)
    .single();

  if (profile?.logo_path) {
    await supabase.storage.from("logos").remove([profile.logo_path]);
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ logo_path: null })
    .eq("id", user.id);

  if (profileErr) {
    return NextResponse.json(
      { error: `Mise à jour profil : ${profileErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
