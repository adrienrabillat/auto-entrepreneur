"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client.
 *
 * La session est persistée via les cookies HTTP-only écrits par le
 * middleware Next.js (voir middleware.ts). `@supabase/ssr` lit / écrit
 * dans ces cookies côté navigateur : le token d'accès est rafraîchi
 * automatiquement avant expiration tant que le refresh_token (valide
 * 30 jours, rotaté à chaque usage) l'est.
 *
 * → Concrètement l'utilisateur reste connecté aussi longtemps qu'il
 *   revient au moins une fois par mois. Fermer l'onglet / le navigateur
 *   ne le déconnecte pas.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // PKCE = plus sûr, et @supabase/ssr stocke le code_verifier dans un
        // cookie lisible par le serveur (-> /auth/callback peut faire
        // exchangeCodeForSession sans localStorage).
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
