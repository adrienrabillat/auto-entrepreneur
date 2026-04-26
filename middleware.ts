import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth cookie on every request and redirects
 * unauthenticated users away from protected pages.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/quotes", "/clients", "/declarations", "/settings", "/onboarding", "/import"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ─── No-cache sur les pages HTML ────────────────────────────────────
  // On force "no-store" pour que le navigateur ne ressorte JAMAIS une
  // version périmée de la page (problème classique en dev : tu push une
  // modif, l'user voit encore l'ancien code parce que sa session navigateur
  // garde le HTML en cache).
  //
  // ATTENTION : ça ne s'applique QU'aux pages dynamiques (HTML servi par
  // Next.js). Le matcher ci-dessous exclut déjà /_next/static et les
  // assets (svg, png, etc.) qui restent cachés normalement — sans ça la
  // perf s'effondrerait. Donc tu gardes le bénéfice du cache pour les
  // gros assets, mais le HTML est toujours frais.
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets & Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
