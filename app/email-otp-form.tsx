"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";

/**
 * Connexion / inscription unifiée par code OTP envoyé par email.
 *
 * Pattern Linear / Notion / Vercel : pas de mot de passe à mémoriser,
 * pas de différence signin / signup côté UI. L'utilisateur saisit son
 * email, reçoit un code à 6 chiffres, et :
 *  - s'il a déjà un compte (Google ou OTP) → on le log,
 *  - s'il n'en a pas → Supabase le crée à la volée puis on log.
 *
 * Convergence Google ↔ OTP : Supabase identifie l'utilisateur par son
 * email. Donc un user qui s'est inscrit via Google avec adrien@gmail.com
 * peut revenir via OTP avec la même adresse — c'est le même compte, les
 * mêmes factures, le même profil. Et inversement.
 *
 * Côté token : aucune gestion manuelle. La session Supabase est stockée
 * dans des cookies HttpOnly par @supabase/ssr, refresh automatique géré
 * par middleware.ts.
 */
type Step = "email" | "code";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export function EmailOtpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Pour focus auto sur l'input code dès qu'on passe en step 2.
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // Décompte du cooldown "renvoyer le code". Tick chaque seconde tant
  // que > 0. setInterval nettoyé sur unmount / changement de valeur.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => {
      setResendIn((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  function clearFeedback() {
    setError(null);
    setInfo(null);
  }

  async function requestCode(targetEmail: string) {
    clearFeedback();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Adresse email invalide.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        // Crée le user s'il n'existe pas — c'est ça qui rend signin et
        // signup indistinguables côté UI.
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (err) {
      setError(translateError(err.message));
      return;
    }
    setStep("code");
    setInfo(`Code envoyé à ${targetEmail}. Vérifie ta boîte mail (et tes spams).`);
    setResendIn(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode(submittedCode: string) {
    clearFeedback();
    if (submittedCode.length !== CODE_LENGTH) {
      setError("Le code doit contenir 6 chiffres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token: submittedCode,
      type: "email",
    });
    if (err || !data.session) {
      setLoading(false);
      setCode("");
      setError(translateError(err?.message ?? "Code invalide ou expiré."));
      // Refocus pour permettre de retaper immédiatement.
      codeInputRef.current?.focus();
      return;
    }

    // Session posée. On regarde si l'onboarding est terminé pour router :
    // un user fraîchement créé n'a pas encore de profile ou a onboarded=false.
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user!.id)
      .maybeSingle();

    const destination = profile?.onboarded ? next || "/dashboard" : "/onboarding";
    router.refresh();
    router.push(destination);
  }

  function handleCodeChange(value: string) {
    // On garde uniquement les chiffres, max CODE_LENGTH.
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    // Auto-submit dès que les 6 chiffres sont entrés (pattern Linear/Notion).
    if (digits.length === CODE_LENGTH && !loading) {
      void verifyCode(digits);
    }
  }

  // ----- Render ---------------------------------------------------------

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void requestCode(email);
        }}
        className="space-y-3 text-left"
      >
        <label className="block">
          <span className="sr-only">Adresse email</span>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="ton.email@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-10 pr-3.5 rounded-full bg-surface-2 text-ink-900 placeholder:text-ink-400 text-small focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </label>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Envoi du code…" : "Continuer avec l'email"}
        </Button>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      </form>
    );
  }

  // step === "code"
  return (
    <div className="space-y-3 text-left">
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          clearFeedback();
        }}
        className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-700 transition-colors"
      >
        <ArrowLeft size={12} aria-hidden />
        Changer d&apos;email
      </button>

      <div>
        <div className="text-small font-medium text-ink-900">
          Entre le code envoyé à
        </div>
        <div className="text-small text-ink-500 truncate">{email}</div>
      </div>

      <label className="block">
        <span className="sr-only">Code à 6 chiffres</span>
        <input
          ref={codeInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          // iOS / Android : le clavier suggère le dernier code SMS reçu
          // et l'autofill mail.app fonctionne avec autoComplete="one-time-code".
          pattern="\d{6}"
          maxLength={CODE_LENGTH}
          required
          placeholder="••••••"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          disabled={loading}
          className="w-full h-14 px-4 rounded-2xl bg-surface-2 text-ink-900 placeholder:text-ink-300 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">
          {loading ? "Vérification…" : "Validation auto au 6ᵉ chiffre"}
        </span>
        <button
          type="button"
          onClick={() => void requestCode(email)}
          disabled={loading || resendIn > 0}
          className="text-brand-600 font-medium hover:underline disabled:text-ink-400 disabled:no-underline"
        >
          {resendIn > 0 ? `Renvoyer (${resendIn}s)` : "Renvoyer le code"}
        </button>
      </div>

      {info ? (
        <div className="rounded-2xl bg-brand-500/10 p-3 text-xs text-brand-700">
          {info}
        </div>
      ) : null}
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </div>
  );
}

/**
 * Traduit les messages Supabase Auth en français pour qu'ils soient
 * compréhensibles. Les codes d'erreur exacts viennent de gotrue / supabase-js.
 */
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("token has expired") || m.includes("expired")) {
    return "Ce code a expiré. Clique sur « Renvoyer le code » pour en obtenir un nouveau.";
  }
  if (m.includes("invalid") && m.includes("otp")) {
    return "Code incorrect. Vérifie et recommence.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Trop de tentatives. Attends une minute avant de réessayer.";
  }
  if (m.includes("email rate limit exceeded")) {
    return "Trop de codes envoyés. Patiente quelques minutes avant un nouvel essai.";
  }
  if (m.includes("user not found")) {
    return "Aucun compte trouvé. Vérifie l'adresse saisie.";
  }
  return message;
}
