"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Section de suppression de client affichée en bas de la fiche d'édition.
 * Séparée visuellement du formulaire (zone danger) pour éviter les clics
 * accidentels. Redirige vers /clients après suppression.
 */
export function DeleteClientSection({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Erreur ${res.status}`);
      }
      router.push("/clients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="surface p-5 md:p-7 mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-small font-medium text-danger-600">Zone danger</div>
            <p className="mt-1 text-xs text-ink-500">
              Supprimer ce client. Les factures et devis déjà émis à son nom
              restent intacts dans ton historique.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setError(null); setOpen(true); }}
            disabled={busy}
            className="pill pill-ghost text-danger-600 hover:bg-danger-500/10 shrink-0"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Supprimer
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        onConfirm={doDelete}
        title={`Supprimer « ${label} » ?`}
        description={
          error
            ? error
            : "Le client sera définitivement supprimé. Les factures et devis déjà émis à son nom restent intacts."
        }
        confirmLabel="Supprimer"
        loading={busy}
        variant="danger"
      />
    </>
  );
}
