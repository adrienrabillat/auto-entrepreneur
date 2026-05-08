"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/feedback";
import { Send, Loader2 } from "lucide-react";

export type ClientOption = { id: string; label: string; email: string };
export type DocOption = {
  kind: "invoice" | "quote";
  id: string;
  number: string;
  clientEmail: string;
  clientName: string | null;
};

/**
 * Compose un nouveau message.
 *
 * UX :
 *  - Picker de client en priorité (existant) OU saisie manuelle d'une
 *    adresse email (cas où le destinataire n'est pas encore en base).
 *  - Liste optionnelle de factures / devis récents pour rattacher la
 *    conversation à un document précis. Le picker se filtre dynamiquement
 *    quand on choisit un client (on ne montre que les docs de ce client).
 *  - Sujet + corps libres. Subject pré-rempli en fonction du document
 *    sélectionné si existant.
 *
 * On POST sur `/api/messages/new`. Le backend :
 *  - find or create thread sur (user_id, client_email)
 *  - envoie via Resend depuis l'alias Asthia
 *  - insère le message outbound
 *  - redirige sur /messages/{thread_id}
 */
export function NewMessageForm({
  clients,
  invoices,
  quotes,
  preset,
}: {
  clients: ClientOption[];
  invoices: DocOption[];
  quotes: DocOption[];
  preset: { invoiceId: string | null; quoteId: string | null; clientId: string | null };
}) {
  const router = useRouter();

  // État destinataire : mode "existing" → picker dans clients[], "manual"
  // → champs email + nom libres.
  const [mode, setMode] = useState<"existing" | "manual">(
    preset.clientId || clients.length > 0 ? "existing" : "manual",
  );
  const [pickedClientId, setPickedClientId] = useState<string>(
    preset.clientId ?? clients[0]?.id ?? "",
  );
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");

  // Document de contexte (optionnel).
  const initialDocKey = preset.invoiceId
    ? `invoice:${preset.invoiceId}`
    : preset.quoteId
      ? `quote:${preset.quoteId}`
      : "";
  const [docKey, setDocKey] = useState<string>(initialDocKey);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedClient = clients.find((c) => c.id === pickedClientId) ?? null;

  // Filtre les docs : si un client est sélectionné, ne propose que les
  // docs de ce client (matching par email exact côté serveur). Sinon
  // on montre tout.
  const targetEmail = mode === "existing" ? pickedClient?.email : manualEmail;
  const filteredDocs = useMemo(() => {
    const all = [...invoices, ...quotes];
    if (!targetEmail) return all;
    const e = targetEmail.toLowerCase();
    return all.filter((d) => d.clientEmail.toLowerCase() === e);
  }, [invoices, quotes, targetEmail]);

  const selectedDoc =
    filteredDocs.find((d) => `${d.kind}:${d.id}` === docKey) ?? null;

  // Pré-remplit le sujet si un document est sélectionné.
  function defaultSubjectFor(d: DocOption | null): string {
    if (!d) return "";
    return d.kind === "invoice"
      ? `Facture ${d.number}`
      : `Devis ${d.number}`;
  }
  const effectiveSubject = subject.trim() || defaultSubjectFor(selectedDoc);

  async function handleSubmit() {
    setError(null);

    let clientEmail: string;
    let clientName: string | null = null;
    if (mode === "existing") {
      if (!pickedClient) {
        setError("Sélectionne un client.");
        return;
      }
      clientEmail = pickedClient.email;
      clientName = pickedClient.label;
    } else {
      const trimmed = manualEmail.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        setError("Adresse email invalide.");
        return;
      }
      clientEmail = trimmed;
      clientName = manualName.trim() || null;
    }

    if (!effectiveSubject) {
      setError("Renseigne un objet pour le message.");
      return;
    }
    if (!body.trim()) {
      setError("Le message est vide.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/messages/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail,
          clientName,
          subject: effectiveSubject,
          text: body.trim(),
          invoiceId: selectedDoc?.kind === "invoice" ? selectedDoc.id : null,
          quoteId: selectedDoc?.kind === "quote" ? selectedDoc.id : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      router.push(`/messages/${json.threadId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
      setBusy(false);
    }
  }

  return (
    <div className="surface p-5 space-y-4">
      {/* Destinataire ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex gap-3 text-small">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="recip_mode"
              checked={mode === "existing"}
              onChange={() => setMode("existing")}
              className="accent-brand-500"
              disabled={clients.length === 0}
            />
            Client existant
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="recip_mode"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
              className="accent-brand-500"
            />
            Saisir une adresse
          </label>
        </div>

        {mode === "existing" ? (
          <select
            value={pickedClientId}
            onChange={(e) => setPickedClientId(e.target.value)}
            className="block w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {clients.length === 0 ? (
              <option value="">Aucun client en base</option>
            ) : (
              clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {c.email}
                </option>
              ))
            )}
          </select>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="m_email">Email</Label>
              <Input
                id="m_email"
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label htmlFor="m_name" hint="optionnel">Nom</Label>
              <Input
                id="m_name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
          </div>
        )}
      </div>

      {/* Document de contexte (optionnel) ─────────────────────── */}
      {filteredDocs.length > 0 ? (
        <div>
          <Label htmlFor="doc_select" hint="optionnel">À propos de</Label>
          <select
            id="doc_select"
            value={docKey}
            onChange={(e) => setDocKey(e.target.value)}
            className="block w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Aucun document</option>
            {filteredDocs.map((d) => (
              <option key={`${d.kind}:${d.id}`} value={`${d.kind}:${d.id}`}>
                {d.kind === "invoice" ? "Facture" : "Devis"} {d.number}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Subject ─────────────────────────────────────────────── */}
      <div>
        <Label htmlFor="m_subject">Objet</Label>
        <Input
          id="m_subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={defaultSubjectFor(selectedDoc) || "Ex: Question rapide sur la prestation"}
        />
      </div>

      {/* Body ────────────────────────────────────────────────── */}
      <div>
        <Label htmlFor="m_body">Message</Label>
        <Textarea
          id="m_body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bonjour…"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-ink-100">
        <p className="text-xs text-ink-500">
          Envoyé depuis ton adresse Asthia. Les réponses arriveront dans Messages.
        </p>
        <Button type="button" onClick={handleSubmit} disabled={busy}>
          {busy ? (
            <><Loader2 size={14} className="animate-spin" /> Envoi…</>
          ) : (
            <><Send size={14} /> Envoyer</>
          )}
        </Button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
