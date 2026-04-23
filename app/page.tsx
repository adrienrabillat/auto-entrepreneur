import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";
import { Mail, Receipt, ShieldCheck, Wand2 } from "lucide-react";

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
      {/* Header — logo + product name. Keep it tight on mobile. */}
      <header className="px-5 md:px-8 py-5 max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.webp"
            alt="Asthia"
            width={36}
            height={36}
            priority
            className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
          />
          <span className="font-extrabold tracking-tight text-h2 text-ink-900">
            Asthia
          </span>
        </Link>
        <span className="hidden sm:inline text-small text-ink-500">
          Factures · URSSAF · Encaissements
        </span>
      </header>

      {/* Hero */}
      <section className="px-5 md:px-8">
        <div className="max-w-3xl mx-auto pt-6 md:pt-16 pb-10 text-center">
          {/* Big logo echo on mobile — fills the top visual space. */}
          <div className="mb-6 md:mb-8 flex justify-center md:hidden">
            <Image
              src="/logo.webp"
              alt=""
              width={112}
              height={112}
              priority
              className="h-28 w-28 rounded-2xl drop-shadow-[0_10px_30px_rgba(30,58,138,0.25)]"
            />
          </div>

          <h1 className="text-display text-ink-900 leading-[1.05]">
            Factures simples.
            <br />
            URSSAF automatique.
          </h1>
          <p className="mt-5 text-body text-ink-600 max-w-xl mx-auto">
            Une app minimaliste pour créer une facture, la recevoir chez ton client par email,
            suivre les encaissements et déclarer ton chiffre d&apos;affaires chaque mois —
            sans y penser.
          </p>

          <div className="mt-8 md:mt-10 flex items-center justify-center">
            <LoginButton next={searchParams.next} />
          </div>

          {searchParams.error ? (
            <p className="mt-4 text-small text-danger-600">
              Connexion interrompue : {searchParams.error}
            </p>
          ) : null}

          <p className="mt-5 text-xs text-ink-500 max-w-md mx-auto">
            En te connectant avec Google, tu autorises Asthia à envoyer les factures depuis ta propre
            boîte Gmail. Aucun email n&apos;est envoyé sans que tu cliques.
          </p>
        </div>
      </section>

      {/* Feature strip — 4 tiles so the page isn't bare on mobile. */}
      <section className="px-5 md:px-8 pb-12 md:pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <FeatureCard
            icon={<Mail size={18} />}
            title="Envoi depuis ton Gmail"
            body="Tes clients reçoivent la facture depuis ton adresse, avec ta signature — pas d'expéditeur bizarre."
          />
          <FeatureCard
            icon={<Receipt size={18} />}
            title="URSSAF automatique"
            body="Chaque mois, Asthia déclare ton chiffre d'affaires encaissé. Tu gardes le contrôle, tu n'y penses plus."
          />
          <FeatureCard
            icon={<Wand2 size={18} />}
            title="Descriptions IA"
            body="Un clic sur la baguette magique et ta description est reformulée proprement, en français correct."
          />
          <FeatureCard
            icon={<ShieldCheck size={18} />}
            title="Conforme 2026"
            body="Mentions URSSAF, IBAN, RCS/RM, Factur-X et PDF/A-3 — prêt pour la facturation électronique obligatoire."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="surface p-4 md:p-5 text-left">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient-subtle text-brand-700">
        {icon}
      </div>
      <h3 className="mt-3 text-h3 text-ink-900">{title}</h3>
      <p className="mt-1 text-small text-ink-500">{body}</p>
    </div>
  );
}
