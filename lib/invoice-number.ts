import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the next invoice number for this user, scoped to the current year,
 * formatted as "YYYY-NNNN" (e.g. "2026-0001"). Sequence is per-user.
 */
export async function nextInvoiceNumber(supabase: SupabaseClient, userId: string): Promise<string> {
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
