import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service role key — bypasses RLS.
 * NEVER import this from anything that can run in the browser.
 * Use it only in route handlers / server actions / cron.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
