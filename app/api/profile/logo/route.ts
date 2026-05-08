import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
// Sharp est une lib native (binaires C++ pour libvips). On force le
// runtime Node.js classique — l'edge runtime n'est pas compatible.
export const runtime = "nodejs";

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

  // pdf-lib (utilisé pour générer les factures) ne sait embed que du
  // PNG ou du JPG. Pour rester user-friendly et accepter aussi WebP / SVG
  // côté upload, on convertit tout vers PNG via sharp (libvips). Le
  // résultat est stocké en `.png`. JPG est passé tel quel pour préserver
  // la qualité (pas de double encoding).
  let storedBytes: Uint8Array;
  let storedContentType: "image/png" | "image/jpeg";
  let storedExt: "png" | "jpg";

  const inputBytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    storedBytes = inputBytes;
    storedContentType = "image/jpeg";
    storedExt = "jpg";
  } else if (file.type === "image/png") {
    storedBytes = inputBytes;
    storedContentType = "image/png";
    storedExt = "png";
  } else {
    // WebP / SVG → conversion PNG via sharp. On limite la taille à 1024
    // px max sur la plus grande dimension : un logo n'a pas besoin de
    // plus, et ça réduit le poids des factures embedées.
    try {
      const png = await sharp(inputBytes)
        .resize({
          width: 1024,
          height: 1024,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      storedBytes = new Uint8Array(png);
      storedContentType = "image/png";
      storedExt = "png";
    } catch (e) {
      console.error("[profile/logo] sharp conversion failed:", e);
      return NextResponse.json(
        {
          error:
            "Conversion du logo impossible. Réessaie en uploadant un PNG ou un JPG.",
        },
        { status: 400 },
      );
    }
  }

  const path = `${user.id}/logo.${storedExt}`;

  // Nettoyage : si un ancien logo existe avec une AUTRE extension
  // (ex: logo.webp uploadé avant la conversion auto), on le supprime
  // pour ne pas laisser de fichier orphelin. upsert s'occupe du cas
  // même extension.
  const { data: existing } = await supabase.storage
    .from("logos")
    .list(user.id);
  const orphans = (existing ?? [])
    .filter((f) => f.name.startsWith("logo.") && f.name !== `logo.${storedExt}`)
    .map((f) => `${user.id}/${f.name}`);
  if (orphans.length > 0) {
    await supabase.storage.from("logos").remove(orphans);
  }

  const { error: upErr } = await supabase.storage
    .from("logos")
    .upload(path, storedBytes, {
      contentType: storedContentType,
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
