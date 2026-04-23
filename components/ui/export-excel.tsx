"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";

/**
 * Bouton "Exporter Excel" — télécharge un .xlsx à 3 onglets (Factures,
 * URSSAF, Récap par mois) depuis /api/export/xlsx. Pas de rechargement
 * de page, on streame le blob côté client.
 */
export function ExportExcelButton({
  label = "Exporter en Excel",
  variant = "secondary",
  size = "sm",
}: {
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportNow() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/export/xlsx");
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      // Récupère le filename depuis Content-Disposition.
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `compta-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error ? <span className="text-small text-danger-600">{error}</span> : null}
      <Button variant={variant} size={size} onClick={exportNow} disabled={busy}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        {busy ? "Génération…" : label}
      </Button>
    </div>
  );
}
