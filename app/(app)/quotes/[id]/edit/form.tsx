"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Save, CalendarDays, FileSignature, Euro } from "lucide-react";

type OpType = "service" | "vente" | "mixte";

type QuoteData = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number | null;
  amount_cents: number;
  operation_type: string;
  valid_until: string | null;
  notes: string | null;
  client_name: string | null;
  client_email: string;
};

function formatEUR(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/**
 * Formulaire d'édition d'un devis existant.
 *
 * On ne modifie PAS le client (pour ça il faudrait recréer un devis) —
 * on édite seulement la prestation, le montant, les dates et les notes.
 * C'est le cas d'usage le plus fréquent : corriger une coquille dans la
 * description ou ajuster le montant avant envoi/renvoi.
 */
export function EditQuoteForm({ quote }: { quote: QuoteData }) {
  const router = useRouter();

  const derivedUnitPrice = quote.unit_price_cents != null
    ? (quote.unit_price_cents / 100).toString().replace(".", ",")
    : (quote.amount_cents / 100 / (quote.quantity || 1)).toFixed(2).replace(".", ",");

  const [description, setDescription] = useState(quote.description);
  const [quantity, setQuantity] = useState(String(quote.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(derivedUnitPrice);
  const [operationType, setOperationType] = useState<OpType>(
    (quote.operation_type as OpType) || "service",
  );
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");

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
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          quantity: q,
          unit_price_cents: puCents,
          amount_cents: total,
          operation_type: operationType,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      // Sprint 5 — uniformisation : ?saved=1 déclenche le SavedToast sur
      // la page détail (cohérent avec invoices/[id]/edit).
      router.push(`/quotes/${quote.id}?saved=1`);
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
              Client : {quote.client_name || quote.client_email}
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
            <Label htmlFor="op_type">Type</Label>
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

        {/* Validité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valid_until">
              <CalendarDays size={12} className="inline -mt-0.5 mr-1" />
              Valable jusqu&apos;au
            </Label>
            <Input
              id="valid_until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {/* Notes internes */}
        <div>
          <Label htmlFor="notes" hint="visible uniquement par toi">Notes internes</Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
