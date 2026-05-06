"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";

/**
 * Bannière d'erreur réutilisable. Remplace les patterns inline divergents
 * (`<p className="text-small text-danger-600 bg-danger-500/10 ...">`) qui
 * étaient écrits différemment dans chaque module.
 *
 * - Si `message` est null/vide → renvoie null (la bannière disparaît).
 * - Le bouton Close (optionnel via `onDismiss`) permet à l'user de la
 *   masquer manuellement.
 *
 * Usage typique dans un form :
 *   <ErrorBanner message={error} onDismiss={() => setError(null)} />
 */
export function ErrorBanner({
  message,
  onDismiss,
  className = "",
}: {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={
        "flex items-start gap-2 rounded-2xl bg-danger-500/10 border border-danger-500/20 px-4 py-2.5 text-small text-danger-600 " +
        className
      }
    >
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span className="flex-1 break-words">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message d'erreur"
          className="shrink-0 grid h-5 w-5 place-items-center rounded-full text-danger-600 hover:bg-danger-500/20 transition-colors"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Toast de succès léger qui apparaît brièvement après une action discrète
 * (ex: enregistrement d'une édition de brouillon). Plus subtil que le
 * SuccessOverlay (qui prend tout l'écran) — adapté aux opérations qui ne
 * justifient pas un changement de contexte.
 *
 * Apparait en bas à droite (top-right en mobile pour ne pas masquer le
 * bottom-nav), disparaît automatiquement après `duration` ms.
 *
 * Usage :
 *   const [saved, setSaved] = useState(false);
 *   ...
 *   setSaved(true);  // après le PATCH réussi
 *   ...
 *   <SavedToast visible={saved} onDone={() => setSaved(false)} />
 */
export function SavedToast({
  visible,
  message = "Modifications enregistrées",
  duration = 2500,
  onDone,
}: {
  visible: boolean;
  message?: string;
  duration?: number;
  onDone?: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDone]);

  if (!visible && !show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "fixed z-40 right-4 bottom-20 md:bottom-4 surface px-4 py-2.5 rounded-2xl shadow-pop " +
        "flex items-center gap-2 text-small text-ink-900 " +
        "transition-all duration-200 " +
        (show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")
      }
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-success-500/15 text-success-600">
        <Check size={14} strokeWidth={3} />
      </span>
      {message}
    </div>
  );
}
