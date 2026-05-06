import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/years
 *
 * Renvoie la liste des années où le user a au moins une facture (toute
 * version : brouillon, envoyée, payée, annulée, avoir). Sert à alimenter
 * le dropdown "Année" du bouton Exporter sans hardcoder de plage.
 *
 * Réponse :
 *   { years: [2024, 2025, 2026], current: 2026 }
 *   - years     : tri décroissant (le plus récent en haut)
 *   - current   : année en cours côté serveur (= défaut sélectionné)
 *
 * Si aucune facture : { years: [], current: 2026 }. L'UI doit alors juste
 * proposer "Toutes années" + l'année courante grisée.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // On rapatrie uniquement la colonne issued_on pour limiter la taille de
  // la réponse — pas besoin du reste pour calculer la liste d'années.
  // Postgres-side aggregation serait plus propre mais Supabase REST ne
  // permet pas le DISTINCT directement ; on dédoublonne côté JS.
  const { data, error } = await supabase
    .from("invoices")
    .select("issued_on")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const yearSet = new Set<number>();
  for (const row of data ?? []) {
    const iso = row.issued_on as string | null;
    if (!iso) continue;
    const y = parseInt(iso.slice(0, 4), 10);
    if (Number.isFinite(y)) yearSet.add(y);
  }

  const years = Array.from(yearSet).sort((a, b) => b - a);
  const current = new Date().getFullYear();

  return NextResponse.json({ years, current });
}
