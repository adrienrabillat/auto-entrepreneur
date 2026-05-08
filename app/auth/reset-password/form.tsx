"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";

/**
 * Formulaire client pour /auth/reset-password.
 *
 * Repose sur la session de recovery posée par Supabase quand l'utilisateur
 * clique sur le lien reçu par email. `updateUser({ password })` est
 * autorisé sans mot de passe actuel tant que cette session est active.
 *
 * En cas d'absence de session (lien expiré ou ouvert dans un autre
 * navigateur), Supabase renverra une erreur explicite qu'on traduit
 * pour l'utilisateur.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      const m = err.message.toLowerCase();
      if (m.includes("auth session missing") || m.includes("not authenticated")) {
        setError(
          "Lien expiré ou invalide. Retourne à l'accueil et redemande un nouveau lien de réinitialisation.",
        );
      } else if (m.includes("same as the old password")) {
        setError("Le nouveau mot de passe doit être différent de l'ancien.");
      } else {
        setError(err.message);
      }
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    // On redirige après une courte temporisation pour que l'utilisateur ait
    // le temps de voir le message de succès.
    setTimeout(() => {
      router.refresh();
      router.push("/dashboard");
    }, 1500);
  }

  if (success) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-small text-emerald-700"
      >
        <Check size={16} className="shrink-0 mt-0.5" />
        <span className="flex-1">
          Mot de passe mis à jour. Redirection en cours…
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="sr-only">Nouveau mot de passe</span>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Nouveau mot de passe (8 caractères min.)"
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

      <label className="block">
        <span className="sr-only">Confirmation du mot de passe</span>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            className="w-full h-11 pl-10 pr-3.5 rounded-full bg-surface-2 text-ink-900 placeholder:text-ink-400 text-small focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      </label>

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? "Mise à jour…" : "Définir mon nouveau mot de passe"}
      </Button>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </form>
  );
}
