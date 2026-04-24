"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteClientButton({ id, label }: { id: string; label: string }) {
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
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
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
        aria-label="Supprimer le client"
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
        title={`Supprimer « ${label} » ?`}
        description={
          error
            ? error
            : "Le client sera archivé. Les factures déjà émises à son nom restent intactes."
        }
        confirmLabel="Supprimer"
        loading={busy}
        variant="danger"
      />
    </>
  );
}
