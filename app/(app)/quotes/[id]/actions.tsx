"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Check, X, ArrowRight, Trash2, Loader2, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/feedback";

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
  canSendEmail,
  invoiceDeleted = false,
}: {
  quote: Quote;
  /** true si un canal email est dispo (Gmail OU Resend). */
  canSendEmail: boolean;
  invoiceDeleted?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Sprint 5 — uniformisation : on remplace les alert() natifs par un
  // état d'erreur inline, identique au pattern utilisé dans
  // invoices/[id]/actions.tsx pour rester cohérent entre modules.
  const [error, setError] = useState<string | null>(null);

  // Un devis converti est "figé" SAUF si la facture liée a été supprimée :
  // dans ce cas on réactive toutes les actions pour permettre reconversion.
  const isConverted = Boolean(quote.converted_invoice_id) && !invoiceDeleted;

  // Helpers : POST/PATCH/DELETE → erreur inline si KO, refresh si OK.
  async function action(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    setError(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!canSendEmail) {
      setError(
        "Aucun canal email disponible. Connecte Gmail depuis Profil ou contacte le support pour activer l'envoi via Asthia.",
      );
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
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur conversion");
      // On redirige direct vers la facture créée — c'est l'action que
      // l'user veut faire à 95% de chance après une conversion.
      router.push(`/invoices/${data.invoiceId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur suppression");
      router.push("/quotes");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
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
        {/* Modifier */}
        <Link href={`/quotes/${quote.id}/edit`}>
          <Button type="button" variant="secondary">
            <Pencil size={14} /> Modifier
          </Button>
        </Link>

        {/* Envoi / renvoi */}
        <Button
          type="button"
          variant={quote.status === "draft" ? "primary" : "secondary"}
          onClick={handleSend}
          disabled={busy !== null}
          title={!canSendEmail ? "Aucun canal email disponible" : ""}
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

        {/* Conversion en facture : si accepté, OU si ancienne conversion supprimée */}
        {quote.status === "accepted" || invoiceDeleted ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleConvert}
            disabled={busy !== null}
          >
            {busy === "convert" ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {invoiceDeleted ? "Reconvertir en facture" : "Convertir en facture"}
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

      {/* Bannière d'erreur inline — pattern identique à invoices/[id]/actions.tsx */}
      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        className="mt-3"
      />

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
