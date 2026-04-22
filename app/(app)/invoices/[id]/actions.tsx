"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  paid_at: string | null;
};

export function InvoiceActions({ invoice, gmailConnected }: { invoice: Invoice; gmailConnected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, url: string, body?: object) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
          <Button
            disabled={!gmailConnected || busy !== null}
            onClick={() => run("send", `/api/invoices/${invoice.id}/send`)}
          >
            {busy === "send" ? "Envoi…" : invoice.status === "sent" ? "Renvoyer par email" : "Envoyer par email"}
          </Button>
        ) : null}

        {invoice.status !== "paid" ? (
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => run("paid", `/api/invoices/${invoice.id}/mark-paid`, { paid: true })}
          >
            {busy === "paid" ? "…" : "Marquer comme payée"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => run("unpaid", `/api/invoices/${invoice.id}/mark-paid`, { paid: false })}
          >
            {busy === "unpaid" ? "…" : "Retirer le paiement"}
          </Button>
        )}
      </div>
      {!gmailConnected && invoice.status !== "paid" ? (
        <p className="text-xs text-ink-500">
          Gmail non connecté — reconnecte-toi avec Google depuis la page d&apos;accueil pour pouvoir envoyer.
        </p>
      ) : null}
      {error ? <p className="text-small text-danger-600">{error}</p> : null}
    </div>
  );
}
