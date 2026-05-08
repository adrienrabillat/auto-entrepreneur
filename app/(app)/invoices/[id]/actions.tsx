"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SavedToast } from "@/components/ui/feedback";
import {
  Send,
  CheckCircle2,
  Undo2,
  Trash2,
  Pencil,
  FileWarning,
  Loader2,
} from "lucide-react";

type Invoice = {
  id: string;
  number: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  paid_at: string | null;
  sent_at?: string | null;
  invoice_type?: string;
  amount_cents: number;
};

export function InvoiceActions({
  invoice,
  canSendEmail,
}: {
  invoice: Invoice;
  /** true si un canal email est dispo (Gmail OU Resend). */
  canSendEmail: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [cnReason, setCnReason] = useState("");
  const [cnAmountStr, setCnAmountStr] = useState("");
  const [cnPartial, setCnPartial] = useState(false);
  // Toast de feedback après envoi/marquage. Visible 2,5 s, puis se cache
  // automatiquement via onDone(). Utilisé pour confirmer un envoi email
  // réussi ou un changement de statut, en complément du badge qui change
  // côté hero.
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const isCreditNote = invoice.invoice_type === "credit_note";

  async function request(key: string, method: "POST" | "DELETE" | "PATCH", url: string, body?: object) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      return json;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      throw e;
    } finally {
      setBusy(null);
    }
  }

  async function run(key: string, url: string, body?: object, successMessage?: string) {
    try {
      await request(key, "POST", url, body);
      if (successMessage) setFlashMessage(successMessage);
      router.refresh();
    } catch {
      /* already surfaced */
    }
  }

  async function doDelete() {
    try {
      await request("delete", "DELETE", `/api/invoices/${invoice.id}`);
      setConfirmOpen(false);
      router.push("/invoices");
      router.refresh();
    } catch {
      /* error surfaced via setError — on laisse le dialog ouvert pour afficher. */
    }
  }

  /**
   * Créer un avoir — 2 cas :
   * - Facture envoyée (non payée) : avoir d'annulation totale + brouillon correctif
   * - Facture payée : avoir total ou partiel (pas de brouillon automatique)
   */
  async function doCreateCreditNote() {
    const amountCents = cnPartial
      ? Math.round(parseFloat(cnAmountStr.replace(",", ".")) * 100)
      : undefined;

    if (cnPartial && (!Number.isFinite(amountCents) || (amountCents ?? 0) <= 0)) {
      setError("Montant de l'avoir invalide.");
      return;
    }

    setBusy("credit_note");
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents: amountCents,
          reason: cnReason.trim() || undefined,
          createCorrectiveDraft: invoice.status === "sent",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");

      setCreditNoteOpen(false);

      // Cas 2 : rediriger vers le brouillon correctif créé
      if (data.newDraftId) {
        router.push(`/invoices/${data.newDraftId}`);
      } else {
        // Cas 3 : rediriger vers l'avoir créé
        router.push(`/invoices/${data.creditNoteId}`);
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* === CAS 1 : Brouillon STANDARD — édition libre. Les avoirs en
              draft ne sont PAS éditables : leur numéro légal est déjà figé
              dans la séquence chronologique URSSAF. === */}
        {invoice.status === "draft" && !isCreditNote ? (
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button type="button" variant="secondary">
              <Pencil size={14} /> Modifier
            </Button>
          </Link>
        ) : null}

        {/* === CAS 2 & 3 : Envoyée ou payée — avoir === */}
        {(invoice.status === "sent" || invoice.status === "paid") && !isCreditNote ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setCnReason("");
              setCnAmountStr("");
              setCnPartial(invoice.status === "paid");
              setCreditNoteOpen(true);
            }}
          >
            <FileWarning size={14} />
            {invoice.status === "sent" ? "Modifier (avoir)" : "Créer un avoir"}
          </Button>
        ) : null}

        {/* Envoi / renvoi.
            Pour une facture : visible tant que pas payée/annulée.
            Pour un avoir : toujours visible (l'avoir est en status='paid'
            par construction mais peut quand même être envoyé/renvoyé). */}
        {(invoice.status !== "paid" && invoice.status !== "cancelled") || isCreditNote ? (
          <Button
            disabled={!canSendEmail || busy !== null}
            onClick={() =>
              run(
                "send",
                `/api/invoices/${invoice.id}/send`,
                undefined,
                isCreditNote
                  ? "Avoir envoyé par email"
                  : invoice.sent_at
                    ? "Facture renvoyée par email"
                    : "Facture envoyée par email",
              )
            }
          >
            <Send size={16} />
            {busy === "send"
              ? "Envoi…"
              : invoice.sent_at
                ? "Renvoyer par email"
                : isCreditNote
                  ? "Envoyer l'avoir"
                  : "Envoyer par email"}
          </Button>
        ) : null}

        {/* Marquer payée / retirer paiement — UNIQUEMENT factures standard.
            Sur un avoir, le statut "paid" est figé (sert à inclure l'avoir
            dans la déclaration URSSAF), pas de toggle utilisateur. */}
        {!isCreditNote ? (
          invoice.status !== "paid" ? (
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() =>
                run(
                  "paid",
                  `/api/invoices/${invoice.id}/mark-paid`,
                  { paid: true },
                  "Marquée comme payée",
                )
              }
            >
              <CheckCircle2 size={16} />
              {busy === "paid" ? "…" : "Marquer comme payée"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() =>
                run(
                  "unpaid",
                  `/api/invoices/${invoice.id}/mark-paid`,
                  { paid: false },
                  "Paiement retiré",
                )
              }
            >
              <Undo2 size={16} />
              {busy === "unpaid" ? "…" : "Retirer le paiement"}
            </Button>
          )
        ) : null}

        {/* Suppression — brouillons STANDARD uniquement (pas les avoirs).
            Supprimer un avoir créerait un trou dans la séquence légale. */}
        {invoice.status === "draft" && !isCreditNote ? (
          <Button
            variant="danger"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
          >
            <Trash2 size={16} />
            {busy === "delete" ? "Suppression…" : "Supprimer le brouillon"}
          </Button>
        ) : null}
      </div>

      {/* Dialog suppression brouillon */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => (busy === "delete" ? undefined : setConfirmOpen(false))}
        onConfirm={doDelete}
        title="Supprimer ce brouillon ?"
        description={
          error
            ? error
            : "La facture brouillon sera définitivement supprimée. Cette action est irréversible."
        }
        confirmLabel="Supprimer"
        loading={busy === "delete"}
        variant="danger"
      />

      {/* Dialog avoir (Cas 2 & 3) */}
      <ConfirmDialog
        open={creditNoteOpen}
        onClose={() => (busy === "credit_note" ? undefined : setCreditNoteOpen(false))}
        onConfirm={doCreateCreditNote}
        title={
          invoice.status === "sent"
            ? "Modifier cette facture envoyée ?"
            : "Créer un avoir"
        }
        description=""
        confirmLabel={
          invoice.status === "sent"
            ? "Annuler et créer le brouillon correctif"
            : "Créer l'avoir"
        }
        loading={busy === "credit_note"}
        variant="danger"
      >
        <div className="space-y-3 mt-2">
          {invoice.status === "sent" ? (
            <div className="rounded-xl bg-warn-500/10 p-3 text-small text-warn-700">
              <strong>Processus légal :</strong> un avoir d&apos;annulation totale sera émis,
              la facture originale sera annulée, et un nouveau brouillon sera créé
              avec les mêmes données. Tu pourras ensuite le modifier librement avant de le renvoyer.
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-small">
                  <input
                    type="radio"
                    name="cn_type"
                    checked={!cnPartial}
                    onChange={() => setCnPartial(false)}
                    className="accent-brand-500"
                  />
                  Avoir total
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-small">
                  <input
                    type="radio"
                    name="cn_type"
                    checked={cnPartial}
                    onChange={() => setCnPartial(true)}
                    className="accent-brand-500"
                  />
                  Avoir partiel
                </label>
              </div>
              {cnPartial ? (
                <div>
                  <Label htmlFor="cn_amount" hint={`max : ${(invoice.amount_cents / 100).toFixed(2).replace(".", ",")} €`}>
                    Montant de l&apos;avoir (€)
                  </Label>
                  <Input
                    id="cn_amount"
                    inputMode="decimal"
                    value={cnAmountStr}
                    onChange={(e) => setCnAmountStr(e.target.value)}
                    placeholder="ex: 150,00"
                  />
                </div>
              ) : null}
            </>
          )}
          <div>
            <Label htmlFor="cn_reason" hint="optionnel">Motif</Label>
            <Textarea
              id="cn_reason"
              rows={2}
              value={cnReason}
              onChange={(e) => setCnReason(e.target.value)}
              placeholder="ex: Erreur de montant, annulation client…"
            />
          </div>
          {error ? (
            <p className="text-small font-medium text-danger-600">{error}</p>
          ) : null}
        </div>
      </ConfirmDialog>

      {!canSendEmail && invoice.status !== "paid" ? (
        <p className="text-xs text-ink-500">
          L&apos;envoi email est temporairement indisponible côté serveur
          (clé Resend manquante). Réessaie dans quelques instants.
        </p>
      ) : null}

      {/* Toast de feedback : "Facture envoyée par email", "Marquée comme
          payée", etc. Disparaît tout seul après 2,5 s. */}
      <SavedToast
        visible={flashMessage !== null}
        message={flashMessage ?? ""}
        onDone={() => setFlashMessage(null)}
      />
      {error && !confirmOpen && !creditNoteOpen ? (
        <p className="text-small font-medium text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
