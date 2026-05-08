import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Récupère les bytes du logo de l'AE depuis Supabase Storage si un
 * `logo_path` est défini sur le profil, et les renvoie au format consommé
 * par `generateInvoicePdf` (PNG ou JPG bruts + mimeType).
 *
 * Retourne `undefined` si :
 *  - L'AE n'a pas de logo configuré.
 *  - Le format n'est pas supporté par pdf-lib (SVG notamment — pdf-lib
 *    ne sait pas rasteriser, et faire ça côté serveur demanderait
 *    d'embarquer une lib type sharp+resvg).
 *  - Le téléchargement échoue (logo manquant en storage, erreur réseau).
 *    On choisit volontairement de ne PAS bloquer la génération du PDF
 *    dans ce cas — on log et on continue sans logo.
 */
export async function loadLogoForPdf(
  supabase: SupabaseClient,
  logoPath: string | null | undefined,
): Promise<{ bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" } | undefined> {
  if (!logoPath) return undefined;

  // Détermine le mimeType depuis l'extension du path (la route d'upload
  // garantit un nom `<user_id>/logo.<ext>`).
  const ext = logoPath.split(".").pop()?.toLowerCase();
  let mimeType: "image/png" | "image/jpeg" | null = null;
  if (ext === "png") mimeType = "image/png";
  else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
  // SVG / WebP : pdf-lib ne les supporte pas en `embedPng`/`embedJpg`.
  // Plutôt que de planter, on skip le logo proprement.
  if (!mimeType) {
    console.warn(`[logo-loader] format non supporté (${ext}), skip embed`);
    return undefined;
  }

  const { data, error } = await supabase.storage.from("logos").download(logoPath);
  if (error || !data) {
    console.warn("[logo-loader] download failed, skip:", error?.message);
    return undefined;
  }

  const arrayBuf = await data.arrayBuffer();
  return { bytes: new Uint8Array(arrayBuf), mimeType };
}
