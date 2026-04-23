"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, Undo2, Trash2 } from "lucide-react";

type Invoice = {
  id: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  paid_at: string | null;
};

export function InvoiceActions({ invoice, gmailConnected }: { invoice: Invoice; gmailConnected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(key: string, method: "POST" | "DELETE", url: string, body?: object) {
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

  async function run(key: string, url: string, body?: object) {
    try {
      await request(key, "POST", url, body);
      router.refresh();
    } catch {
      /* already surfaced */
    }
  }

  async function onDelete() {
    if (!window.confirm("Supprimer définitivement ce brouillon ? Cette action est irréversible.")) return;
    try {
      await request("delete", "DELETE", `/api/invoices/${invoice.id}`);
      router.push("/invoices");
      router.refresh();
    } catch {
      /* error already surfaced */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
          <Button
            disabled={!gmailConnected || busy !== null}
            onClick={() => run("send", `/api/invoices/${invoice.id}/send`)}
          >
            <Send size={16} />
            {busy === "send" ? "Envoi…" : invoice.status === "sent" ? "Renvoyer par email" : "Envoyer par email"}
          </Button>
        ) : null}

        {invoice.status !== "paid" ? (
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => run("paid", `/api/invoices/${invoice.id}/mark-paid`, { paid: true })}
          >
            <CheckCircle2 size={16} />
            {busy === "paid" ? "…" : "Marquer comme payée"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => run("unpaid", `/api/invoices/${invoice.id}/mark-paid`, { paid: false })}
          >
            <Undo2 size={16} />
            {busy === "unpaid" ? "…" : "Retirer le paiement"}
          </Button>
        )}

        {invoice.status === "draft" ? (
          <Button
            variant="danger"
            disabled={busy !== null}
            onClick={onDelete}
          >
            <Trash2 size={16} />
            {busy === "delete" ? "Suppression…" : "Supprimer le brouillon"}
          </Button>
        ) : null}
      </div>
      {!gmailConnected && invoice.status !== "paid" ? (
        <p className="text-xs text-ink-500">
          Gmail non connecté — reconnecte-toi avec Google depuis la page d&apos;accueil pour pouvoir envoyer.
        </p>
      ) : null}
      {error ? (
        <p className="text-small font-medium text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
