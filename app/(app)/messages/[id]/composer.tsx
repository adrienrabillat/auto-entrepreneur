"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ErrorBanner, SavedToast } from "@/components/ui/feedback";
import { Send, Loader2, Wand2 } from "lucide-react";

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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /**
   * Améliore le brouillon de réponse via Mistral. Le sujet n'est pas
   * exposé ici (c'est une réponse, le sujet est implicite « Re: … »),
   * on ne récupère donc que le `text` reformulé.
   */
  async function callAiImprove() {
    const trimmed = body.trim();
    if (!trimmed) {
      setAiError("Écris un brouillon avant de l'améliorer.");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/suggest-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "improve",
          clientEmail,
          currentText: trimmed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      if (typeof json.text === "string" && json.text.trim()) {
        setBody(json.text.trim());
      } else {
        throw new Error("Réponse IA vide");
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Suggestion IA impossible");
    } finally {
      setAiBusy(false);
    }
  }

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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={callAiImprove}
            disabled={aiBusy || busy || !body.trim()}
            title="Reformuler le brouillon avec l'IA"
          >
            {aiBusy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> IA…
              </>
            ) : (
              <>
                <Wand2 size={14} /> Améliorer avec l&apos;IA
              </>
            )}
          </Button>
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
      </div>

      <ErrorBanner message={aiError} onDismiss={() => setAiError(null)} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SavedToast
        visible={flashMessage !== null}
        message={flashMessage ?? ""}
        onDone={() => setFlashMessage(null)}
      />
    </div>
  );
}
