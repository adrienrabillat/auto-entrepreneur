import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const err = searchParams.error;
  const isPkceError = err?.toLowerCase().includes("pkce") || err?.toLowerCase().includes("code verifier");

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header ultra-minimal */}
      <header className="px-5 md:px-8 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image
            src="/logo.webp"
            alt="Asthia"
            width={28}
            height={28}
            priority
            className="h-7 w-7 rounded-md"
          />
          <span className="font-extrabold tracking-tight text-ink-900">Asthia</span>
        </Link>
      </header>

      {/* Single centered card — slogan + bouton, rien d'autre */}
      <section className="flex-1 grid place-items-center px-5 pb-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[2.4rem] md:text-[3rem] leading-[1.05] font-extrabold tracking-tight text-ink-900">
            Facture, envoie, <span className="text-gradient-brand">déclare</span>.
          </h1>
          <p className="mt-3 text-body text-ink-500">
            Sans y penser.
          </p>

          <div className="mt-8">
            <LoginButton next={searchParams.next} />
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl bg-danger-500/10 p-3.5 text-small text-danger-600">
              {isPkceError
                ? "Connexion interrompue. Clique à nouveau sur « Se connecter » depuis le même appareil et le même navigateur."
                : `Connexion interrompue : ${err}`}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
