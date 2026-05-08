"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ErrorBanner, SavedToast } from "@/components/ui/feedback";
import { Send, Loader2 } from "lucide-react";

/**
 * Composer de réponse — envoie un message outbound dans le thread via
 * `POST /api/messages/[id]/reply`. Le backend re-émet via Resend depuis
 * l'alias Asthia de l'AE, avec les headers In-Reply-To pour préserver
 * le threading côté client.
 */
export function Composer({
  threadId,
  clientEmail,
}: {
  threadId: string;
  clientEmail: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Le message est vide.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      setBody("");
      setFlashMessage("Réponse envoyée");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-4 space-y-3">
      <div className="text-small font-medium text-ink-700">
        Répondre à <span className="text-ink-900">{clientEmail}</span>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Écris ta réponse…"
        disabled={busy}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          Envoyé depuis ton adresse Asthia, avec ton identité.
        </p>
        <Button
          type="button"
          onClick={handleSend}
          disabled={busy || !body.trim()}
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Envoi…
            </>
          ) : (
            <>
              <Send size={14} /> Envoyer
            </>
          )}
        </Button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SavedToast
        visible={flashMessage !== null}
        message={flashMessage ?? ""}
        onDone={() => setFlashMessage(null)}
      />
    </div>
  );
}
