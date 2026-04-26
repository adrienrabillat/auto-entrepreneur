"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SuccessOverlay } from "@/components/ui/success-overlay";
import { formatEUR } from "@/lib/format";
import { Loader2, Send, Save, AlertCircle } from "lucide-react";

type ClientLite = {
  id: string;
  name: string | null;
  email: string;
  siren: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
};

/**
 * Formulaire de création d'un devis. Single-page (pas de wizard) car
 * un devis est conceptuellement plus léger qu'une facture (pas de
 * paiement, pas d'IBAN obligatoire).
 *
 * 3 sections visuelles : Client, Prestation, Validité & notes.
 *
 * Le bouton "Créer & envoyer" est disabled si Gmail n'est pas connecté
 * (même pas peine d'essayer, l'API renverra une erreur). Sinon "Créer
 * en brouillon" est toujours dispo.
 */
export function NewQuoteForm({
  clients,
  canSend,
}: {
  clients: ClientLite[];
  canSend: boolean;
}) {
  const router = useRouter();

  // Valeurs par défaut : validité = aujourd'hui + 30 jours.
  const defaultValidUntil = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  // ─── State ────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(""); // saisie en euros, string
  const [operationType, setOperationType] = useState<"service" | "vente" | "mixte">("service");

  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modal de confirmation post-création — même look que pour les factures
  // pour garder l'uniformité entre modules. On stocke ici l'id + le numéro
  // + le booléen "envoyé" pour adapter le message.
  const [success, setSuccess] = useState<{
    id: string;
    number: string;
    sent: boolean;
    clientLabel: string;
    clientEmail: string;
    totalCents: number;
  } | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────
  const qty = Number(quantity) || 0;
  const pu = parseEuroToCents(unitPrice);
  const totalCents = Math.max(0, Math.round(qty * pu));
  const canSubmit =
    description.trim().length > 0 &&
    qty > 0 &&
    pu > 0 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail.trim()) &&
    !submitting;

  function applyClientPrefill(id: string) {
    setSelectedClientId(id);
    if (!id) {
      // Reset → champs libres
      setClientEmail("");
      setClientName("");
      setClientSiren("");
      setClientAddress("");
      return;
    }
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientEmail(c.email);
    setClientName(c.name ?? "");
    setClientSiren(c.siren ?? "");
    const addr = [c.address_line1, [c.postal_code, c.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n");
    setClientAddress(addr);
  }

  async function handleSubmit(send: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const cleanSiren = clientSiren.replace(/\s/g, "");
      if (cleanSiren && !/^\d{9}$/.test(cleanSiren)) {
        throw new Error("SIREN client invalide (9 chiffres attendus).");
      }

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          quantity: qty,
          unit_price_cents: pu,
          amount_cents: totalCents,
          client_id: selectedClientId || null,
          client_email: clientEmail.trim(),
          client_name: clientName.trim() || null,
          client_siren: cleanSiren || null,
          client_address: clientAddress.trim() || null,
          operation_type: operationType,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          send,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création devis");
      // Affiche le modal de confirmation. La navigation vers la page de
      // détail se fera via le bouton CTA du modal (pas de redirection
      // automatique — l'user voit ce qu'il vient de créer).
      setSuccess({
        id: data.id,
        number: data.number,
        sent: send,
        clientLabel: clientName.trim() || clientEmail.trim(),
        clientEmail: clientEmail.trim(),
        totalCents: totalCents,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setSubmitting(false);
    }
  }

  // Si le devis vient d'être créé avec succès, on affiche UNIQUEMENT le
  // modal de confirmation (le formulaire est masqué pour ne pas que
  // l'user re-clique par erreur sur "Créer").
  if (success) {
    return (
      <SuccessOverlay
        title={success.sent ? "Devis envoyé" : "Brouillon enregistré"}
        subtitle={`N° ${success.number}`}
        rows={[
          { label: "Client", value: success.clientLabel, sub: success.clientEmail },
          { label: "Montant", value: formatEUR(success.totalCents) },
          { label: "Statut", value: success.sent ? "Envoyé par Gmail" : "Brouillon" },
        ]}
        cta={{
          label: "Voir le devis",
          onClick: () => {
            router.push(`/quotes/${success.id}`);
            router.refresh();
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Client ───────────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-h3">Client</h2>

        {clients.length > 0 ? (
          <div>
            <Label htmlFor="select_client" hint="ou laisse vide pour saisir un nouveau client">
              Choisir un client existant
            </Label>
            <select
              id="select_client"
              value={selectedClientId}
              onChange={(e) => applyClientPrefill(e.target.value)}
              className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
            >
              <option value="">— Nouveau client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client_email">Email du client</Label>
            <Input
              id="client_email"
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="contact@exemple.fr"
            />
          </div>
          <div>
            <Label htmlFor="client_name" hint="optionnel">Nom / raison sociale</Label>
            <Input
              id="client_name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Société Dupont"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client_siren" hint="9 chiffres si pro">SIREN client</Label>
            <Input
              id="client_siren"
              inputMode="numeric"
              value={clientSiren}
              onChange={(e) => setClientSiren(e.target.value)}
              placeholder="123 456 789"
            />
          </div>
          <div>
            <Label htmlFor="client_address" hint="optionnel">Adresse client</Label>
            <textarea
              id="client_address"
              rows={2}
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="w-full rounded-xl bg-surface px-3 py-2.5 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow resize-none"
              placeholder="12 rue Léonard de Vinci&#10;75008 Paris"
            />
          </div>
        </div>
      </Card>

      {/* ─── Prestation ────────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-h3">Prestation</h2>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl bg-surface px-3 py-2.5 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow resize-none"
            placeholder="Refonte du site web — maquettes + intégration"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
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
              placeholder="1200,00"
            />
          </div>
          <div>
            <Label htmlFor="op_type">Type</Label>
            <select
              id="op_type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as "service" | "vente" | "mixte")}
              className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
            >
              <option value="service">Service</option>
              <option value="vente">Vente</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-surface-2 px-4 py-3 flex items-center justify-between">
          <span className="text-small text-ink-500">Total HT</span>
          <span className="text-h3 tabular-nums tracking-tight">
            {(totalCents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </div>
      </Card>

      {/* ─── Validité & notes ─────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-h3">Validité & notes</h2>
        <div>
          <Label htmlFor="valid_until" hint="au-delà de cette date, le devis est considéré comme expiré">
            Valable jusqu&apos;au
          </Label>
          <Input
            id="valid_until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="notes" hint="visible uniquement par toi, jamais envoyé au client">
            Notes internes
          </Label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl bg-surface px-3 py-2.5 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow resize-none"
            placeholder="Relancer le 15 mars si pas de réponse"
          />
        </div>
      </Card>

      {error ? (
        <div className="rounded-2xl bg-danger-500/10 border border-danger-500/20 p-3.5 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-small text-danger-700">{error}</p>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!canSubmit}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Créer en brouillon
        </Button>
        <Button
          type="button"
          disabled={!canSubmit || !canSend}
          onClick={() => handleSubmit(true)}
          title={!canSend ? "Gmail doit être connecté pour envoyer" : ""}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Créer & envoyer
        </Button>
      </div>
    </div>
  );
}

/**
 * Convertit une saisie utilisateur en euros (string) en centimes.
 * Tolérant aux formats FR ("1 234,50") et US ("1234.50").
 */
function parseEuroToCents(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(/€/g, "").replace(",", ".");
  const f = parseFloat(cleaned);
  if (!Number.isFinite(f) || f < 0) return 0;
  return Math.round(f * 100);
}
