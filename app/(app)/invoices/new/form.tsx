"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

type OpType = "service" | "vente" | "mixte";

export type ClientOption = {
  id: string;
  label: string;
  is_pro: boolean;
  name: string;
  email: string;
  siren: string | null;
  address: string | null;
};

const MANUAL = "__manual__";

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function NewInvoiceForm({
  gmailConnected,
  clients,
}: {
  gmailConnected: boolean;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [pickedClient, setPickedClient] = useState<string>(clients[0]?.id ?? MANUAL);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [operationType, setOperationType] = useState<OpType>("service");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [executionDate, setExecutionDate] = useState(todayIso());
  const [dueOn, setDueOn] = useState("");
  const [discountTerms, setDiscountTerms] = useState("Néant");
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveClient = useMemo(() => {
    if (pickedClient === MANUAL) return null;
    return clients.find((c) => c.id === pickedClient) ?? null;
  }, [pickedClient, clients]);

  const amountCents = useMemo(() => {
    const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
    const q = parseFloat(quantity.replace(",", ".")) || 1;
    return Math.round(pu * q);
  }, [unitPrice, quantity]);

  async function submit(action: "save" | "send") {
    setBusy(action);
    setError(null);
    try {
      const q = parseFloat(quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) throw new Error("La quantité doit être > 0.");
      const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100);
      if (!Number.isFinite(pu) || pu <= 0) throw new Error("Le prix unitaire doit être > 0.");
      const total = Math.round(pu * q);

      let email = clientEmail.trim();
      let name: string | null = clientName.trim() || null;
      let siren: string | null = clientSiren.replace(/\s/g, "") || null;
      let address: string | null = clientAddress.trim() || null;
      let client_id: string | null = null;

      if (effectiveClient) {
        email = effectiveClient.email;
        name = effectiveClient.name;
        siren = effectiveClient.siren;
        address = effectiveClient.address;
        client_id = effectiveClient.id;
      }

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Email du client invalide");
      }
      if (siren && !/^\d{9}$/.test(siren)) {
        throw new Error("Le SIREN du client doit contenir 9 chiffres.");
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          quantity: q,
          unit_price_cents: pu,
          amount_cents: total,
          client_id,
          client_email: email,
          client_name: name,
          client_siren: siren,
          client_address: address,
          operation_type: operationType,
          delivery_address: deliveryAddress.trim() || null,
          execution_date: executionDate || null,
          due_on: dueOn || null,
          discount_terms: discountTerms.trim() || "Néant",
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
      className="space-y-6"
    >
      <Card className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Label htmlFor="client_picker">Client</Label>
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-1 text-small text-brand-600 hover:text-brand-700 font-semibold"
            >
              <Plus size={14} /> Nouveau client
            </Link>
          </div>
          <select
            id="client_picker"
            value={pickedClient}
            onChange={(e) => setPickedClient(e.target.value)}
            className="h-12 w-full rounded-xl bg-white px-3 text-body ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:shadow-glow transition"
          >
            {clients.length === 0 ? null : (
              <optgroup label="Mes clients">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} {c.is_pro ? "· Pro" : "· Particulier"}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={MANUAL}>— Saisir manuellement —</option>
          </select>

          {effectiveClient ? (
            <div className="mt-3 rounded-xl bg-ink-50 p-3 text-small text-ink-700">
              <div className="font-semibold text-ink-900">{effectiveClient.name}</div>
              <div className="text-ink-500">{effectiveClient.email}</div>
              {effectiveClient.siren ? (
                <div className="text-ink-500">SIREN {effectiveClient.siren}</div>
              ) : null}
              {effectiveClient.address ? (
                <div className="text-ink-500 whitespace-pre-line">{effectiveClient.address}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name" hint="optionnel">Nom du client</Label>
                <Input id="client_name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="client_email">Email du client</Label>
                <Input id="client_email" type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="client_siren" hint="requis pour un pro">SIREN</Label>
                <Input
                  id="client_siren"
                  inputMode="numeric"
                  value={clientSiren}
                  onChange={(e) => setClientSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="client_address" hint="optionnel">Adresse</Label>
                <Textarea
                  id="client_address"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              required
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="unit_price" hint="€ HT / unité">Prix unitaire</Label>
            <Input
              id="unit_price"
              required
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="60"
            />
          </div>
          <div>
            <Label htmlFor="total" hint="calculé">Total HT</Label>
            <Input
              id="total"
              disabled
              value={
                Number.isFinite(amountCents) && amountCents > 0
                  ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100)
                  : ""
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="operation_type" hint="obligatoire dès sept. 2026">Nature</Label>
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
          <div>
            <Label htmlFor="execution_date" hint="date d'exécution">Exécution</Label>
            <Input
              id="execution_date"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="due_on" hint="optionnel — échéance">Règlement</Label>
            <Input
              id="due_on"
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
            />
          </div>
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

        <div>
          <Label htmlFor="discount_terms" hint="URSSAF : mention obligatoire, « Néant » par défaut">
            Conditions d&apos;escompte
          </Label>
          <Input
            id="discount_terms"
            value={discountTerms}
            onChange={(e) => setDiscountTerms(e.target.value)}
          />
        </div>

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
