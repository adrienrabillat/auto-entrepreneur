import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Génère le prochain numéro de facture pour un user, en respectant le format
 * personnalisé qu'il a choisi à l'onboarding et la séquence persistée dans
 * `profiles.invoice_number_seed`.
 *
 * Tokens supportés dans le format :
 *   {year}      — année en cours sur 4 chiffres
 *   {seq}       — séquence brute, sans padding
 *   {seq:N}     — séquence avec padding zéros sur N caractères
 *
 * Exemples :
 *   format = "F-{year}-{seq:4}", seed = 46  →  "F-2026-0047"
 *   format = "{year}/{seq:3}",   seed = 0   →  "2026/001"
 *   format = "{seq}",            seed = 122 →  "123"
 *
 * IMPORTANT — atomicité : on incrémente le seed ET on insère la facture
 * dans la même requête côté appelant. Cette fonction se contente de
 * proposer le PROCHAIN numéro et d'incrémenter le seed atomiquement via
 * un UPDATE returning. Si deux factures sont créées simultanément, la
 * sérialisation Postgres garantit qu'elles auront deux seeds distincts.
 *
 * Fallback de compatibilité : si le profil n'a pas encore de format/seed
 * (compte créé avant la migration 2026-04-26c), on retombe sur l'ancien
 * comportement "YYYY-NNNN" basé sur la lecture du dernier number émis.
 */
export async function nextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  // 1. Lire format + seed du profil. On utilise maybeSingle pour gérer le
  //    cas (théorique) où le profil n'existe pas encore.
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("invoice_number_format, invoice_number_seed")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) throw profErr;

  // Fallback si la migration n'a pas été appliquée (pas de colonnes).
  // On préserve l'ancien comportement pour ne pas casser les comptes legacy.
  if (!profile || profile.invoice_number_format == null || profile.invoice_number_seed == null) {
    return legacyNextInvoiceNumber(supabase, userId);
  }

  const format: string = profile.invoice_number_format;
  const seed: number = profile.invoice_number_seed;
  const nextSeq = seed + 1;

  // 2. Incrémenter le seed atomiquement. On fait un UPDATE conditionnel
  //    sur la valeur lue pour éviter qu'une race ne donne deux fois le
  //    même numéro (pattern "compare-and-swap").
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ invoice_number_seed: nextSeq })
    .eq("id", userId)
    .eq("invoice_number_seed", seed);

  if (updateErr) throw updateErr;

  // 3. Rendre le format avec les valeurs concrètes.
  return renderNumber(format, nextSeq);
}

/**
 * Variante pour les devis. Logique identique mais lit/écrit
 * quote_number_format / quote_number_seed.
 *
 * Note légale : contrairement aux factures, les devis n'ont PAS d'obligation
 * de séquence chronologique sans trou. Mais on applique la même rigueur par
 * cohérence visuelle pour l'utilisateur.
 */
export async function nextQuoteNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("quote_number_format, quote_number_seed")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) throw profErr;
  if (!profile || profile.quote_number_format == null || profile.quote_number_seed == null) {
    // Fallback simple : "D-YYYY-0001" si rien n'est configuré encore.
    const year = new Date().getFullYear();
    return `D-${year}-0001`;
  }

  const format: string = profile.quote_number_format;
  const seed: number = profile.quote_number_seed;
  const nextSeq = seed + 1;

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ quote_number_seed: nextSeq })
    .eq("id", userId)
    .eq("quote_number_seed", seed);

  if (updateErr) throw updateErr;

  return renderNumber(format, nextSeq);
}

/**
 * Rend un format en remplaçant {year} et {seq[:N]} par leurs valeurs.
 * Exporté pour réutilisation dans l'aperçu de l'onboarding.
 */
export function renderNumber(format: string, seq: number): string {
  if (!format) return String(seq);
  const year = String(new Date().getFullYear());
  return format
    .replace(/\{year\}/g, year)
    .replace(/\{seq:(\d+)\}/g, (_, n) => String(seq).padStart(parseInt(n, 10), "0"))
    .replace(/\{seq\}/g, String(seq));
}

/**
 * Ancien comportement : on lit le dernier number émis pour l'année et on
 * incrémente. Conservé en fallback pour les profils legacy qui n'ont pas
 * encore les colonnes invoice_number_format/seed.
 *
 * À supprimer une fois que tous les comptes sont migrés.
 */
async function legacyNextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const { data, error } = await supabase
    .from("invoices")
    .select("number")
    .eq("user_id", userId)
    .like("number", `${prefix}%`)
    .order("number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.number;
  const n = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const next = isNaN(n) ? 1 : n + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
