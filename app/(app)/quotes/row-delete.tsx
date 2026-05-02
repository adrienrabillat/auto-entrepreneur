"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Bouton corbeille inline sur les rows de la liste devis.
 * Même pattern que DeleteDraftButton (invoices) et DeleteClientButton (clients)
 * pour uniformité UX entre les modules.
 *
 * N'apparaît PAS sur les devis convertis en facture (le parent filtre).
 */
export function DeleteQuoteButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setOpen(true);
  }

  async function doDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Erreur ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Supprimer le devis"
        onClick={onClick}
        disabled={busy}
        className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-danger-500/10 hover:text-danger-600 disabled:opacity-50 transition-colors"
      >
        <Trash2 size={16} />
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        onConfirm={doDelete}
        title="Supprimer ce devis ?"
        description={
          error
            ? error
            : `Le devis ${number} sera définitivement supprimé. Le client ne sera pas notifié.`
        }
        confirmLabel="Supprimer"
        loading={busy}
        variant="danger"
      />
    </>
  );
}
