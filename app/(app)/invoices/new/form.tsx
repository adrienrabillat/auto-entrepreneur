"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type OpType = "service" | "vente" | "mixte";

export function NewInvoiceForm({ gmailConnected }: { gmailConnected: boolean }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [operationType, setOperationType] = useState<OpType>("service");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showB2B, setShowB2B] = useState(false);
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "save" | "send") {
    setBusy(action);
    setError(null);
    try {
      const amountCents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error("Le montant doit être supérieur à 0.");
      }
      const cleanSiren = clientSiren.replace(/\s/g, "");
      if (cleanSiren && !/^\d{9}$/.test(cleanSiren)) {
        throw new Error("Le SIREN du client doit contenir 9 chiffres.");
      }
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount_cents: amountCents,
          client_email: clientEmail.trim(),
          client_name: clientName.trim() || null,
          client_siren: cleanSiren || null,
          client_address: clientAddress.trim() || null,
          operation_type: operationType,
          delivery_address: deliveryAddress.trim() || null,
          send: action === "send",
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);
      router.push(`/invoices/${payload.id}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("send");
      }}
    >
      <Card className="space-y-5">
        <div>
          <Label htmlFor="description">Description de la prestation</Label>
          <Textarea
            id="description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Séance de sophrologie du 14 avril 2026"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount" hint="€ TTC">Montant</Label>
            <Input
              id="amount"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="60"
            />
          </div>
          <div>
            <Label htmlFor="operation_type" hint="obligatoire dès sept. 2026">Nature de l&apos;opération</Label>
            <select
              id="operation_type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OpType)}
              className="h-12 w-full rounded-xl bg-white px-3 text-body ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:shadow-glow transition"
            >
              <option value="service">Prestation de services</option>
              <option value="vente">Vente de biens</option>
              <option value="mixte">Vente + prestation</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client_name" hint="optionnel">Nom du client</Label>
            <Input
              id="client_name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Marie Martin"
            />
          </div>
          <div>
            <Label htmlFor="client_email">Email du client</Label>
            <Input
              id="client_email"
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@exemple.fr"
            />
          </div>
        </div>

        <button
          type="button"
          className="text-small text-ink-500 hover:text-ink-800"
          onClick={() => setShowB2B((x) => !x)}
        >
          {showB2B ? "– Masquer" : "+ Champs B2B"} (SIREN client, adresse, livraison)
        </button>

        {showB2B ? (
          <div className="space-y-4 border-t border-ink-200 pt-4">
            <div>
              <Label htmlFor="client_siren" hint="obligatoire pour un client professionnel">SIREN du client</Label>
              <Input
                id="client_siren"
                inputMode="numeric"
                value={clientSiren}
                onChange={(e) => setClientSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="123456789"
              />
            </div>
            <div>
              <Label htmlFor="client_address" hint="optionnel">Adresse de facturation</Label>
              <Textarea
                id="client_address"
                rows={2}
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder={"12 rue des Lilas\n75011 Paris"}
              />
            </div>
            {operationType !== "service" ? (
              <div>
                <Label htmlFor="delivery_address" hint="si différente de l'adresse de facturation">Adresse de livraison</Label>
                <Textarea
                  id="delivery_address"
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        <div className="flex flex-col md:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => submit("save")} disabled={busy !== null}>
            {busy === "save" ? "Enregistrement…" : "Enregistrer en brouillon"}
          </Button>
          <Button type="submit" disabled={busy !== null || !gmailConnected}>
            {busy === "send" ? "Envoi…" : "Créer et envoyer"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
