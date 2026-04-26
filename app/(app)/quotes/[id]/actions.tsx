"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Check, X, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Quote = {
  id: string;
  number: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  converted_invoice_id: string | null;
};

/**
 * Boutons d'actions sur la page détail d'un devis.
 *
 * Stratégie d'affichage selon le statut :
 *   - draft     : Envoyer + Supprimer
 *   - sent      : Renvoyer + Marquer accepté + Marquer refusé + Supprimer
 *   - accepted  : Convertir en facture (si pas déjà fait) + Renvoyer
 *   - rejected/expired : Renvoyer + Supprimer
 *
 * Une fois converti en facture, on retire les boutons d'action (le devis
 * devient un "snapshot" historique, on ne peut plus le modifier).
 */
export function QuoteActions({
  quote,
  gmailConnected,
}: {
  quote: Quote;
  gmailConnected: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isConverted = Boolean(quote.converted_invoice_id);

  // Helpers : POST/PATCH/DELETE → toast d'erreur si KO, refresh si OK.
  async function action(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!gmailConnected) {
      alert("Gmail n'est pas connecté. Va dans Paramètres → Reconnecter Gmail.");
      return;
    }
    await action("send", () =>
      fetch(`/api/quotes/${quote.id}/send`, { method: "POST" }),
    );
  }

  async function handleStatus(status: "accepted" | "rejected" | "sent") {
    await action(status, () =>
      fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  }

  async function handleConvert() {
    setBusy("convert");
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur conversion");
      // On redirige direct vers la facture créée — c'est l'action que
      // l'user veut faire à 95% de chance après une conversion.
      router.push(`/invoices/${data.invoiceId}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setBusy("delete");
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur suppression");
      router.push("/quotes");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inattendue");
      setBusy(null);
    }
  }

  // Cas converti : on n'affiche que le lien vers la facture.
  if (isConverted) {
    return (
      <div className="text-small text-ink-500 italic">
        Ce devis a été figé suite à sa conversion en facture. Pour modifier
        quelque chose, modifie directement la facture.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-100">
        {/* Envoi / renvoi */}
        <Button
          type="button"
          variant={quote.status === "draft" ? "primary" : "secondary"}
          onClick={handleSend}
          disabled={busy !== null}
          title={!gmailConnected ? "Gmail non connecté" : ""}
        >
          {busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {quote.status === "draft" ? "Envoyer" : "Renvoyer"}
        </Button>

        {/* Statut accepté/refusé : visible si envoyé ET pas encore tranché */}
        {quote.status === "sent" || quote.status === "expired" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatus("accepted")}
              disabled={busy !== null}
            >
              {busy === "accepted" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Marquer accepté
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatus("rejected")}
              disabled={busy !== null}
            >
              {busy === "rejected" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Marquer refusé
            </Button>
          </>
        ) : null}

        {/* Revert depuis accepted/rejected (cas erreur de saisie) */}
        {quote.status === "accepted" || quote.status === "rejected" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleStatus("sent")}
            disabled={busy !== null}
          >
            {busy === "sent" ? <Loader2 size={14} className="animate-spin" /> : null}
            Revenir à &laquo; envoyé &raquo;
          </Button>
        ) : null}

        {/* Conversion en facture : seulement si accepté */}
        {quote.status === "accepted" ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleConvert}
            disabled={busy !== null}
          >
            {busy === "convert" ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Convertir en facture
          </Button>
        ) : null}

        {/* Suppression : toujours autorisée tant que non converti */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={busy !== null}
          className="text-danger-600 hover:bg-danger-500/10"
        >
          {busy === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Supprimer
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer ce devis ?"
        description={`Le devis ${quote.number} sera définitivement supprimé. Le client ne sera pas notifié.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </>
  );
}
