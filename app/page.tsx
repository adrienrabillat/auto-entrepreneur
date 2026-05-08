import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";
import { EmailLoginForm } from "./email-login-form";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // On regarde si l'onboarding est terminé pour router proprement.
    // Si l'utilisateur a quitté en plein milieu du wizard, le flag
    // `onboarded` est encore false → on le ramène sur le formulaire.
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
  }

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

          <div className="mt-8 space-y-4">
            <LoginButton next={searchParams.next} />

            {/* Séparateur "ou" entre Google et email/password.
                Permet aux utilisateurs sans Google (cas de l'instructrice
                URSSAF par exemple) de créer un compte avec une adresse
                email classique. */}
            <div className="flex items-center gap-3 text-xs text-ink-400">
              <span className="flex-1 h-px bg-divider" aria-hidden />
              <span className="uppercase tracking-wider">ou</span>
              <span className="flex-1 h-px bg-divider" aria-hidden />
            </div>

            <EmailLoginForm next={searchParams.next} />
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

      {/* Footer minimaliste — accès aux pages légales avant connexion.
          Sprint 5 #13 : obligatoire pour conformité LCEN.
          Le lien "L'essentiel du statut — Autoentrepreneur.urssaf.fr" est
          requis par l'URSSAF dans le cadre du partenariat API TDAE
          (Tierce Déclaration Auto-Entrepreneur) — il couvre les
          informations sur le statut, le caractère obligatoire des
          cotisations, leur rôle, et les éléments liés au droit du travail. */}
      <footer className="px-5 md:px-8 py-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
            <Link href="/legal/mentions-legales" className="hover:text-ink-700 transition-colors">
              Mentions légales
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cgu" className="hover:text-ink-700 transition-colors">
              CGU
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cgv" className="hover:text-ink-700 transition-colors">
              CGV
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/confidentialite" className="hover:text-ink-700 transition-colors">
              Confidentialité
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/statut-auto-entrepreneur" className="hover:text-ink-700 transition-colors">
              Statut auto-entrepreneur
            </Link>
          </div>
          <a
            href="https://www.autoentrepreneur.urssaf.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors"
          >
            L&apos;essentiel du statut —{" "}
            <span className="underline underline-offset-2">
              Autoentrepreneur.urssaf.fr
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
