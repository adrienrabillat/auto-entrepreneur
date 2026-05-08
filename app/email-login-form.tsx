"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";

/**
 * Formulaire de connexion par email + mot de passe.
 *
 * Pourquoi ce composant en plus de la connexion Google ?
 *  - Permettre aux instructeurs URSSAF (et plus généralement à toute
 *    personne sans Google Workspace) de créer un compte sans dépendre
 *    d'un compte Gmail.
 *  - Le bouton Google reste affiché : Asthia s'appuie sur le scope
 *    `gmail.send` pour envoyer les factures depuis la boîte de
 *    l'utilisateur. Tant que Resend Outbound n'est pas branché côté
 *    app, on garde Google comme méthode "premium" pour les utilisateurs
 *    Gmail. Quand Resend prendra le relais, on pourra retirer Google
 *    et basculer 100 % email/password.
 *
 * Flux :
 *  - Sign in : `signInWithPassword` → session immédiate → on rafraîchit
 *    le routeur, le middleware redirige vers /dashboard ou /onboarding.
 *  - Sign up : `signUp` avec `emailRedirectTo: /auth/callback?next=/onboarding`
 *    → Supabase envoie un mail de confirmation. L'utilisateur clique,
 *    arrive sur /auth/callback qui exchange le code, puis tombe sur
 *    le wizard d'onboarding.
 *  - Mot de passe oublié : `resetPasswordForEmail` envoie un magic link
 *    qui pointe vers /auth/reset-password.
 */
type Mode = "signin" | "signup" | "forgot";

export function EmailLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset() {
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();

    // Validation côté client minimale — Supabase fait le reste.
    if (!email || !email.includes("@")) {
      setError("Adresse email invalide.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(translateError(err.message));
          setLoading(false);
          return;
        }
        // La session est posée, on laisse le middleware router (il décide
        // entre /dashboard et /onboarding selon le flag profile.onboarded).
        router.refresh();
        router.push(next || "/dashboard");
      } else if (mode === "signup") {
        const redirectTo = new URL(
          "/auth/callback",
          window.location.origin,
        );
        redirectTo.searchParams.set("next", "/onboarding");
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo.toString() },
        });
        if (err) {
          setError(translateError(err.message));
          setLoading(false);
          return;
        }
        // Supabase peut soit (a) envoyer un mail de confirmation, soit (b)
        // créer la session directement si "Confirm email" est désactivé en
        // dashboard. On gère les deux cas.
        if (data.session) {
          router.refresh();
          router.push("/onboarding");
        } else {
          setInfo(
            "Compte créé. Vérifie ta boîte mail et clique sur le lien de confirmation pour activer ton compte.",
          );
          setLoading(false);
        }
      } else {
        // forgot password
        const redirectTo = new URL(
          "/auth/reset-password",
          window.location.origin,
        );
        const { error: err } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: redirectTo.toString() },
        );
        if (err) {
          setError(translateError(err.message));
          setLoading(false);
          return;
        }
        setInfo(
          "Email envoyé. Si un compte existe à cette adresse, tu vas recevoir un lien pour définir un nouveau mot de passe.",
        );
        setLoading(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue.",
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      {/* Switcher Sign in / Sign up — le mode "forgot" est un sous-état de
          "signin", on revient dessus avec un lien dédié. */}
      {mode !== "forgot" ? (
        <div className="grid grid-cols-2 bg-surface-2 p-1 rounded-full text-small">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              reset();
            }}
            className={
              "h-9 rounded-full font-medium transition-colors " +
              (mode === "signin"
                ? "bg-surface text-ink-900 shadow-hair"
                : "text-ink-500 hover:text-ink-700")
            }
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              reset();
            }}
            className={
              "h-9 rounded-full font-medium transition-colors " +
              (mode === "signup"
                ? "bg-surface text-ink-900 shadow-hair"
                : "text-ink-500 hover:text-ink-700")
            }
          >
            Inscription
          </button>
        </div>
      ) : (
        <div className="text-small text-ink-700 font-medium">
          Mot de passe oublié
        </div>
      )}

      {/* Email */}
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

      {/* Password (sauf en mode forgot) */}
      {mode !== "forgot" ? (
        <label className="block">
          <span className="sr-only">Mot de passe</span>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              placeholder={
                mode === "signin"
                  ? "Mot de passe"
                  : "Mot de passe (8 caractères min.)"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-10 pr-11 rounded-full bg-surface-2 text-ink-900 placeholder:text-ink-400 text-small focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-7 w-7 rounded-full text-ink-400 hover:text-ink-700 hover:bg-surface transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
      ) : null}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full"
      >
        {loading
          ? mode === "signin"
            ? "Connexion…"
            : mode === "signup"
              ? "Création du compte…"
              : "Envoi du lien…"
          : mode === "signin"
            ? "Se connecter"
            : mode === "signup"
              ? "Créer mon compte"
              : "Recevoir le lien de réinitialisation"}
      </Button>

      {/* Liens secondaires */}
      <div className="flex items-center justify-between text-xs text-ink-500 pt-1">
        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              reset();
            }}
            className="hover:text-ink-700 transition-colors underline-offset-2 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        ) : null}
        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              reset();
            }}
            className="hover:text-ink-700 transition-colors underline-offset-2 hover:underline"
          >
            ← Retour à la connexion
          </button>
        ) : null}
      </div>

      {/* Feedback messages */}
      {info ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-small text-emerald-700"
        >
          <Check size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1 break-words">{info}</span>
        </div>
      ) : null}

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </form>
  );
}

/**
 * Traduit en français les messages d'erreur Supabase Auth les plus
 * fréquents. On garde le message original en fallback pour ne rien
 * masquer en cas d'erreur inattendue.
 */
function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (m.includes("user already registered")) {
    return "Un compte existe déjà avec cette adresse email. Connecte-toi à la place.";
  }
  if (m.includes("email rate limit")) {
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  }
  if (m.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (m.includes("email not confirmed")) {
    return "Email non confirmé. Vérifie ta boîte mail et clique sur le lien de confirmation.";
  }
  if (m.includes("for security purposes")) {
    return "Pour des raisons de sécurité, tu dois patienter quelques secondes avant de réessayer.";
  }
  return msg;
}
