import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated Supabase user for the current request.
 *
 * Wrapped in React's request-scoped `cache()` so that calling it from the
 * layout AND from the page during the same render only triggers a single
 * `auth.getUser()` network round-trip to Supabase's Auth API instead of two.
 *
 * Pages should prefer this helper over calling `supabase.auth.getUser()`
 * directly to keep server render fast.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
