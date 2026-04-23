"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteClientButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Supprimer le client « ${label} » ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || `Erreur ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Supprimer le client"
      onClick={onClick}
      disabled={busy}
      className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}
