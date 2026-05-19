import Image from "next/image";
import Link from "next/link";

/**
 * Page de réinitialisation du mot de passe — DÉSACTIVÉE depuis mai 2026.
 *
 * Le système de mot de passe a été remplacé par un flow OTP code par email
 * (cf. {@link ../../email-otp-form.tsx EmailOtpForm}). Cette page est
 * conservée uniquement pour amortir les anciens liens "mot de passe oublié"
 * encore présents dans les boîtes mail des utilisateurs : on leur explique
 * qu'il suffit d'aller sur la home et de demander un code.
 *
 * Une fois le délai d'expiration des anciens liens passé (~7 jours), la
 * route peut être supprimée — y compris ./form.tsx devenu orphelin.
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
          <span className="font-extrabold tracking-tight text-ink-900">Asthia</span>
        </Link>
      </header>

      <section className="flex-1 grid place-items-center px-5 pb-16">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-h1 text-ink-900">Plus besoin de mot de passe</h1>
          <p className="text-body text-ink-500">
            Depuis quelques jours, on s&apos;est débarrassés des mots de passe.
            Pour te connecter, va sur la page d&apos;accueil et entre ton
            email — on t&apos;envoie un code à 6 chiffres.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
