"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorBanner, SavedToast } from "@/components/ui/feedback";
import { Image as ImageIcon, Trash2, Upload, Loader2 } from "lucide-react";

/**
 * Bloc d'upload du logo de l'AE.
 *
 * - Drag-and-drop OU clic pour ouvrir le picker système.
 * - Aperçu instantané du logo courant si déjà uploadé (logoUrl prop).
 * - PNG / JPG / WebP / SVG, 2 Mo max.
 * - Bouton "Supprimer" pour revenir à un PDF sans logo.
 *
 * On utilise router.refresh() après chaque action pour resynchroniser le
 * server-rendered display (la page parent fournit logoUrl en prop, donc
 * un refresh recharge proprement).
 */
export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/logo", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      setFlashMessage("Logo enregistré");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer le logo ? Les PDF générés ensuite n'afficheront plus de logo.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/profile/logo", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      setFlashMessage("Logo supprimé");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setBusy(null);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset l'input pour permettre de réuploader le même fichier après
    // suppression (sinon onChange ne refire pas).
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-5
          flex items-center gap-4 transition-colors
          ${dragOver ? "border-brand-500 bg-brand-500/5" : "border-ink-200 hover:border-brand-400 hover:bg-surface-2"}
        `}
      >
        {/* Aperçu */}
        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-2 grid place-items-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon size={24} className="text-ink-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium text-ink-900">
            {logoUrl ? "Logo actuel" : "Aucun logo"}
          </div>
          <div className="text-small text-ink-500">
            Clique ou dépose un fichier ici · PNG, JPG, WebP, SVG · 2 Mo max
          </div>
        </div>

        <div className="shrink-0">
          {busy === "upload" ? (
            <Loader2 size={18} className="animate-spin text-brand-600" />
          ) : (
            <Upload size={18} className="text-ink-500" />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      {logoUrl ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={busy !== null}
            className="text-danger-600 hover:bg-danger-500/10"
          >
            {busy === "delete" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Supprimer le logo
          </Button>
        </div>
      ) : null}

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <SavedToast
        visible={flashMessage !== null}
        message={flashMessage ?? ""}
        onDone={() => setFlashMessage(null)}
      />
    </div>
  );
}
