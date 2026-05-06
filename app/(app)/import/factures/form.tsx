"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEUR } from "@/lib/format";
import { Upload, Loader2, Check, AlertTriangle, FileText, X } from "lucide-react";

type ValidationError = {
  row: number;
  field: string;
  message: string;
  raw?: string;
};

type ImportResponse = {
  ok?: boolean;
  imported?: number;
  skipped?: { number: string; reason: string }[];
  warnings?: ValidationError[];
  validation?: ValidationError[];
  error?: string;
};

/**
 * Form client d'upload + import des factures historiques.
 *
 * Flux :
 *   1. L'AE choisit un fichier CSV/XLSX → on l'envoie à /api/invoices/import
 *   2. La réponse contient soit des erreurs de validation détaillées, soit
 *      un bilan { imported, skipped, warnings }.
 *   3. On affiche le résultat et on propose de retourner à la liste des
 *      factures pour vérifier l'import.
 *
 * Pas de preview avant import : la validation côté serveur est stricte
 * (tout-ou-rien si erreurs de format, fallback ligne par ligne uniquement
 * pour les conflits de numéro). Si l'AE a un doute, il peut tester avec
 * 2-3 lignes d'abord.
 */
export function ImportFacturesForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationError[] | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function reset() {
    setFile(null);
    setError(null);
    setValidation(null);
    setResult(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setValidation(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/invoices/import", { method: "POST", body: fd });
      const data: ImportResponse = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.validation) && data.validation.length > 0) {
          setValidation(data.validation);
        } else {
          setError(data.error || `Erreur ${res.status}`);
        }
        return;
      }
      setResult(data);
      router.refresh(); // recharge la liste des "déjà importées" en bas
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  // Affichage du succès final.
  if (result?.ok) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-2xl bg-success-500/10 text-success-600 shrink-0">
            <Check size={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-h3 text-ink-900">Import réussi</h2>
            <p className="text-small text-ink-500 mt-0.5">
              <strong>{result.imported ?? 0}</strong> facture
              {(result.imported ?? 0) > 1 ? "s" : ""} ajoutée
              {(result.imported ?? 0) > 1 ? "s" : ""} à l&apos;historique.
            </p>
          </div>
        </div>

        {result.skipped && result.skipped.length > 0 ? (
          <div className="rounded-xl bg-warn-500/10 border border-warn-500/30 p-3 text-small text-warn-600">
            <p className="font-medium mb-1.5">
              {result.skipped.length} ligne{result.skipped.length > 1 ? "s" : ""} ignorée
              {result.skipped.length > 1 ? "s" : ""} (numéro déjà présent) :
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {result.skipped.slice(0, 10).map((s, i) => (
                <li key={i}>
                  <span className="font-mono">{s.number}</span> — {s.reason}
                </li>
              ))}
              {result.skipped.length > 10 ? (
                <li className="italic">…et {result.skipped.length - 10} autres</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {result.warnings && result.warnings.length > 0 ? (
          <div className="rounded-xl bg-surface-2 p-3 text-xs text-ink-500">
            <p className="font-medium text-ink-700 mb-1">
              {result.warnings.length} avertissement{result.warnings.length > 1 ? "s" : ""} :
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {result.warnings.slice(0, 5).map((w, i) => (
                <li key={i}>
                  Ligne {w.row} ({w.field}) : {w.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" onClick={reset}>
            Importer un autre fichier
          </Button>
          <a href="/invoices" className="pill pill-primary">
            Voir mes factures
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0">
          <Upload size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-h3 text-ink-900">Téléverse ton fichier</h2>
          <p className="text-small text-ink-500 mt-0.5">
            CSV ou XLSX, max 5 Mo. Première ligne = en-têtes.
          </p>
        </div>
      </div>

      {/* Zone de dépôt minimaliste : un input file natif stylé. Pas de
          drag-drop pour rester simple — l'AE typique sait cliquer. */}
      <label
        htmlFor="invoice-import-file"
        className={
          "flex items-center gap-3 rounded-2xl border-2 border-dashed p-4 cursor-pointer transition-colors " +
          (file
            ? "border-brand-500 bg-brand-500/5"
            : "border-ink-200 hover:border-brand-500/50 hover:bg-surface-2")
        }
      >
        <FileText size={18} className={file ? "text-brand-600" : "text-ink-400"} />
        <div className="flex-1 min-w-0">
          {file ? (
            <>
              <div className="text-small font-medium text-ink-900 truncate">{file.name}</div>
              <div className="text-xs text-ink-500">{(file.size / 1024).toFixed(1)} Ko</div>
            </>
          ) : (
            <>
              <div className="text-small font-medium text-ink-700">
                Choisir un fichier CSV ou XLSX
              </div>
              <div className="text-xs text-ink-500">Cliquez pour parcourir</div>
            </>
          )}
        </div>
        {file ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFile(null);
            }}
            aria-label="Retirer le fichier"
            className="h-8 w-8 grid place-items-center rounded-full text-ink-500 hover:bg-danger-500/10 hover:text-danger-600 transition-colors"
          >
            <X size={14} />
          </button>
        ) : null}
        <input
          id="invoice-import-file"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ?? null);
            setError(null);
            setValidation(null);
          }}
        />
      </label>

      {error ? (
        <p className="text-small text-danger-600 bg-danger-500/10 rounded-xl px-4 py-2.5">
          {error}
        </p>
      ) : null}

      {validation && validation.length > 0 ? (
        <div className="rounded-xl bg-danger-500/10 border border-danger-500/30 p-3 space-y-1.5">
          <p className="text-small font-medium text-danger-600 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            {validation.length} erreur{validation.length > 1 ? "s" : ""} dans le fichier
          </p>
          <ul className="text-xs text-danger-600 list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
            {validation.slice(0, 20).map((v, i) => (
              <li key={i}>
                Ligne {v.row} ({v.field}) : {v.message}
                {v.raw ? <span className="ml-1 italic opacity-70">— &laquo;{v.raw}&raquo;</span> : null}
              </li>
            ))}
            {validation.length > 20 ? (
              <li className="italic opacity-70">…et {validation.length - 20} autres</li>
            ) : null}
          </ul>
          <p className="text-xs text-ink-500 pt-1">
            Corrige le fichier et réessaie. Aucune facture n&apos;a été importée.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={!file || busy}>
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Import en cours…
            </>
          ) : (
            <>
              <Upload size={14} />
              Importer
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
