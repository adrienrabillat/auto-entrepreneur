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

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="font-semibold tracking-tight">
          auto-entrepreneur
        </Link>
        <div className="text-small text-ink-500">Factures · Encaissements · URSSAF</div>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-display text-ink-900">
            Factures simples.
            <br />
            URSSAF automatique.
          </h1>
          <p className="mt-5 text-body text-ink-600 max-w-xl mx-auto">
            Une app minimaliste pour créer une facture, la recevoir chez ton client par email,
            suivre les encaissements et déclarer ton chiffre d&apos;affaires chaque mois — sans y penser.
          </p>

          <div className="mt-10 flex items-center justify-center">
            <LoginButton next={searchParams.next} />
          </div>

          {searchParams.error ? (
            <p className="mt-4 text-small text-danger-600">
              Connexion interrompue : {searchParams.error}
            </p>
          ) : null}

          <p className="mt-6 text-xs text-ink-500">
            En te connectant avec Google, tu autorises l&apos;app à envoyer les factures depuis ta propre
            boîte Gmail. Aucun email n&apos;est envoyé sans que tu cliques.
          </p>
        </div>
      </section>

      <footer className="px-6 py-5 text-xs text-ink-500 max-w-6xl mx-auto w-full">
        Construit pour les auto-entrepreneurs. Design inspiré de Notion.
      </footer>
    </main>
  );
}
