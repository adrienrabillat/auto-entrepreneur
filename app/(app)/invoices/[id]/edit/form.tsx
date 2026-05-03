"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Save, CalendarDays, FileSignature, Euro } from "lucide-react";

type OpType = "service" | "vente" | "mixte";

type InvoiceData = {
  id: string;
  number: string;
  description: string;
  quantity: number;
  unit_price_cents: number | null;
  amount_cents: number;
  operation_type: string;
  execution_date: string | null;
  delivery_address: string | null;
  due_on: string | null;
  discount_terms: string | null;
  client_name: string | null;
  client_email: string;
};

function formatEUR(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/**
 * Formulaire d'édition d'une facture brouillon.
 *
 * Pattern identique à EditQuoteForm : on ne modifie PAS le client,
 * on édite seulement la prestation, le montant, les dates et les conditions.
 */
export function EditInvoiceForm({ invoice }: { invoice: InvoiceData }) {
  const router = useRouter();

  const derivedUnitPrice = invoice.unit_price_cents != null
    ? (invoice.unit_price_cents / 100).toString().replace(".", ",")
    : (invoice.amount_cents / 100 / (invoice.quantity || 1)).toFixed(2).replace(".", ",");

  const [description, setDescription] = useState(invoice.description);
  const [quantity, setQuantity] = useState(String(invoice.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(derivedUnitPrice);
  const [operationType, setOperationType] = useState<OpType>(
    (invoice.operation_type as OpType) || "service",
  );
  const [executionDate, setExecutionDate] = useState(invoice.execution_date ?? "");
  const [dueOn, setDueOn] = useState(invoice.due_on ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(invoice.delivery_address ?? "");
  const [discountTerms, setDiscountTerms] = useState(invoice.discount_terms ?? "Néant");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = useMemo(() => {
    const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
    const q = parseFloat(quantity.replace(",", ".")) || 1;
    return Math.round(pu * q);
  }, [unitPrice, quantity]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Décris la prestation.");
      return;
    }
    const q = parseFloat(quantity.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setError("Quantité invalide.");
      return;
    }
    const pu = parseFloat(unitPrice.replace(",", "."));
    if (!Number.isFinite(pu) || pu <= 0) {
      setError("Prix unitaire invalide.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const puCents = Math.round(pu * 100);
      const total = Math.round(puCents * q);
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          quantity: q,
          unit_price_cents: puCents,
          amount_cents: total,
          operation_type: operationType,
          execution_date: executionDate || null,
          delivery_address: deliveryAddress.trim() || null,
          due_on: dueOn || null,
          discount_terms: discountTerms.trim() || "Néant",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="space-y-5">
        {/* En-tête */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-500/10 text-brand-600">
            <FileSignature size={16} />
          </div>
          <div>
            <div className="font-medium text-ink-900">Modifier la prestation</div>
            <div className="text-xs text-ink-500">
              Client : {invoice.client_name || invoice.client_email}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Qté / PU / Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              inputMode="decimal"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="unit_price">Prix unitaire (HT €)</Label>
            <Input
              id="unit_price"
              inputMode="decimal"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="op_type">Nature</Label>
            <select
              id="op_type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OpType)}
              className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
            >
              <option value="service">Service</option>
              <option value="vente">Vente</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
        </div>

        {/* Total calculé */}
        <div className="rounded-xl bg-surface-2 px-4 py-3 flex items-center justify-between">
          <span className="text-small text-ink-500 inline-flex items-center gap-1.5">
            <Euro size={14} /> Total HT
          </span>
          <span className="text-h3 tabular-nums tracking-tight">{formatEUR(amountCents)}</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="execution_date">
              <CalendarDays size={12} className="inline -mt-0.5 mr-1" />
              Date d&apos;exécution
            </Label>
            <Input
              id="execution_date"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="due_on" hint="optionnel">Échéance</Label>
            <Input
              id="due_on"
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
            />
          </div>
        </div>

        {/* Adresse de livraison (si vente) */}
        {operationType !== "service" ? (
          <div>
            <Label htmlFor="delivery_address" hint="si différente de la facturation">Adresse de livraison</Label>
            <Textarea
              id="delivery_address"
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
        ) : null}

        {/* Conditions d'escompte */}
        <div>
          <Label htmlFor="discount_terms" hint="URSSAF : mention obligatoire">Conditions d&apos;escompte</Label>
          <Input
            id="discount_terms"
            value={discountTerms}
            onChange={(e) => setDiscountTerms(e.target.value)}
          />
        </div>

        {/* Erreur */}
        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={busy}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </Button>
        </div>
      </Card>
    </form>
  );
}
