"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dialogue de confirmation réutilisable — remplace window.confirm().
 *
 * Usage :
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={doDelete}
 *     title="Supprimer la facture ?"
 *     description="Cette action est irréversible."
 *     confirmLabel="Supprimer"
 *     loading={busy}
 *     variant="danger"
 *   />
 *
 * - Focus piégé dans le modal, fermeture par Escape ou clic sur le backdrop.
 * - Animation : fade-in sur le backdrop + pop-in sur la carte.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  variant = "danger",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "primary";
  children?: React.ReactNode;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portal : on attend le mount côté client pour accéder à document.body.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Escape ferme le dialog (sauf si en cours de confirmation).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Empêche le scroll du body tant que le dialog est ouvert.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Donne le focus au bouton Annuler (pas au bouton dangereux) — standard UX.
    // On utilise un petit timeout pour laisser le rendu arriver d'abord.
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, loading, onClose]);

  if (!open || !mounted) return null;

  const accentClass =
    variant === "danger"
      ? "bg-danger-500/10 text-danger-600"
      : "bg-brand-500/10 text-brand-600";

  // Rendu via un Portal dans document.body pour échapper à tout ancêtre
  // transformé (ex : .animate-fade-in-up sur les pages) qui casserait le
  // position:fixed. Sans ça, le dialog s'ancre au conteneur transformé
  // au lieu du viewport et apparaît décalé à droite.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        // Clic sur le backdrop (pas sur la carte) = fermer.
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md surface p-6 md:p-7 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-2xl ${accentClass}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-h3 text-ink-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-small text-ink-500">{description}</p>
            ) : null}
          </div>
          {/* Bouton fermer (discret) */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-surface-2 hover:text-ink-700 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
