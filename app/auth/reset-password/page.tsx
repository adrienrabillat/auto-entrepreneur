import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "./form";

/**
 * Page de réinitialisation du mot de passe.
 *
 * Atterrissage depuis le mail Supabase "resetPasswordForEmail" :
 *   1. L'utilisateur clique sur le lien dans son mail
 *   2. Supabase pose un cookie de session "recovery" et redirige vers
 *      l'URL `redirectTo` qu'on a fournie (cette page)
 *   3. Tant que la session de recovery est active, `updateUser({ password })`
 *      est autorisé sans demander le mot de passe actuel
 *   4. Une fois le nouveau mot de passe défini, on redirige vers /dashboard
 *      (ou /onboarding si pas encore fait)
 *
 * Cette page est volontairement publique (pas de redirect si pas de
 * session) — c'est le formulaire interne qui gère les états (pas de
 * session valide → message d'erreur explicite "lien expiré, redemande-en
 * un nouveau").
 */
export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh flex flex-col">
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
          <span className="font-extrabold tracking-tight text-ink-900">
            Asthia
          </span>
        </Link>
      </header>

      <section className="flex-1 grid place-items-center px-5 pb-16">
        <div className="w-full max-w-md">
          <h1 className="text-h1 text-center mb-2">Nouveau mot de passe</h1>
          <p className="text-body text-ink-500 text-center mb-8">
            Définis un nouveau mot de passe pour ton compte Asthia.
          </p>
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
