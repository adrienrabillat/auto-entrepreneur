"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmailSuggestion } from "@/components/ui/email-suggestion";
import { SuccessOverlay } from "@/components/ui/success-overlay";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Search,
  User,
  Users,
  Wand2,
  X,
  Euro,
  CalendarDays,
  FileSignature,
  Send,
  Save,
} from "lucide-react";

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

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatFrDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Wizard de création d'un devis. Calque la structure de NewInvoiceForm
 * pour garder la cohérence visuelle entre les deux modules :
 *
 *   Étape 1 — Client (pickup d'un client existant OU saisie manuelle)
 *   Étape 2 — Prestation (description avec polish IA, qty, PU, type, validité, notes)
 *   Étape 3 — Aperçu (PDF live via /api/quotes/preview)
 *   Étape 4 — Modal SuccessOverlay (partagé avec factures et clients)
 *
 * Différences avec les factures :
 *   - Pas de paiement (donc pas de payment_terms, due_on, prepaid)
 *   - "Validité jusqu'au" à la place (par défaut +30 jours)
 *   - Notes internes optionnelles (jamais envoyées au client)
 *   - Pas de Factur-X (réservé aux factures B2B)
 */
export function NewQuoteForm({
  gmailConnected,
  clients,
}: {
  gmailConnected: boolean;
  clients: ClientOption[];
}) {
  const router = useRouter();

  // ─── Wizard state ────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Étape 1 — client
  const [mode, setMode] = useState<"existing" | "manual">(clients.length ? "existing" : "manual");
  const [pickedClientId, setPickedClientId] = useState<string>(clients[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  // "Enregistrer ce client dans mon carnet" — coché par défaut quand l'user
  // est en saisie manuelle. Décocher = devis one-shot, on ne crée pas la fiche.
  const [saveAsClient, setSaveAsClient] = useState(true);

  // Étape 2 — prestation
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [operationType, setOperationType] = useState<OpType>("service");
  const [validUntil, setValidUntil] = useState(plusDaysIso(30));
  const [notes, setNotes] = useState("");

  // AI polish (étape 2)
  const [polishing, setPolishing] = useState(false);
  const [polished, setPolished] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);

  // Submit + success
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    id: string;
    number: string;
    sent: boolean;
    clientLabel: string;
    clientEmail: string;
    totalCents: number;
  }>(null);

  // Étape 3 — aperçu PDF live
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────
  const effectiveClient = useMemo(() => {
    if (mode !== "existing") return null;
    return clients.find((c) => c.id === pickedClientId) ?? null;
  }, [mode, pickedClientId, clients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.label + " " + c.email).toLowerCase().includes(q));
  }, [search, clients]);

  const amountCents = useMemo(() => {
    const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
    const q = parseFloat(quantity.replace(",", ".")) || 1;
    return Math.round(pu * q);
  }, [unitPrice, quantity]);

  // ─── Aperçu PDF — déclenché à chaque arrivée à l'étape 3 ─────────
  useEffect(() => {
    if (step !== 3) return;
    if (amountCents <= 0) return;

    let cancelled = false;
    let currentUrl: string | null = null;

    async function run() {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const q = parseFloat(quantity.replace(",", ".")) || 1;
        const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
        const body = {
          description: description.trim(),
          quantity: q,
          unit_price_cents: pu,
          amount_cents: amountCents,
          client_email: effectiveClient?.email || clientEmail,
          client_name: effectiveClient?.name ?? (clientName || null),
          client_siren: effectiveClient?.siren ?? (clientSiren.replace(/\s/g, "") || null),
          client_address: effectiveClient?.address ?? (clientAddress || null),
          operation_type: operationType,
          valid_until: validUntil || null,
        };
        const res = await fetch("/api/quotes/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || `Erreur ${res.status}`);
        }
        const blob = await res.blob();
        if (cancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setPreviewUrl(currentUrl);
      } catch (e: unknown) {
        if (cancelled) return;
        setPreviewError(e instanceof Error ? e.message : "Aperçu indisponible");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Validation par étape ───────────────────────────────────────
  function validateStep1(): string | null {
    if (mode === "existing") {
      if (!effectiveClient) return "Choisis un client ou passe en saisie manuelle.";
      return null;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail.trim()))
      return "Email du client invalide.";
    const siren = clientSiren.replace(/\s/g, "");
    if (siren && !/^\d{9}$/.test(siren)) return "SIREN : 9 chiffres attendus.";
    return null;
  }

  function validateStep2(): string | null {
    if (!description.trim()) return "Décris la prestation.";
    const q = parseFloat(quantity.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) return "Quantité invalide.";
    const pu = parseFloat(unitPrice.replace(",", "."));
    if (!Number.isFinite(pu) || pu <= 0) return "Prix unitaire invalide.";
    return null;
  }

  function tryAdvance() {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : s));
  }

  function goBack() {
    setError(null);
    setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : s));
  }

  // ─── AI polish description ──────────────────────────────────────
  async function polishDescription() {
    if (!description.trim()) {
      setPolishError("Tape d'abord ta description.");
      return;
    }
    setPolishing(true);
    setPolished(null);
    setPolishError(null);
    try {
      const res = await fetch("/api/ai/polish-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setPolished(data.polished as string);
    } catch (e: unknown) {
      setPolishError(e instanceof Error ? e.message : "L'IA n'a pas pu améliorer ce texte.");
    } finally {
      setPolishing(false);
    }
  }

  function applyPolished() {
    if (polished) {
      setDescription(polished);
      setPolished(null);
    }
  }

  // ─── Submit (depuis étape 3) ────────────────────────────────────
  async function submit(action: "save" | "send") {
    const err = validateStep1() || validateStep2();
    if (err) {
      setError(err);
      return;
    }
    if (action === "send" && !gmailConnected) {
      setError("Gmail n'est pas connecté. Va dans Paramètres → Reconnecter Gmail.");
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const q = parseFloat(quantity.replace(",", ".")) || 1;
      const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
      const total = Math.round(pu * q);
      const email = effectiveClient?.email || clientEmail;
      const cleanSiren = (effectiveClient?.siren ?? clientSiren).replace(/\s/g, "") || null;

      // Création du client si demandé (mode manuel + checkbox cochée).
      // On ne bloque pas le devis si la création client échoue — le devis
      // est plus important que le carnet d'adresses.
      let createdClientId: string | null = effectiveClient?.id ?? null;
      if (mode === "manual" && saveAsClient) {
        try {
          const cRes = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              is_pro: Boolean(cleanSiren),
              email,
              company_name: cleanSiren ? clientName : null,
              first_name: cleanSiren ? null : (clientName.split(" ")[0] || null),
              last_name: cleanSiren ? null : (clientName.split(" ").slice(1).join(" ") || null),
              siren: cleanSiren,
              address_line1: clientAddress.split("\n")[0] || null,
              city: null,
              postal_code: null,
            }),
          });
          if (cRes.ok) {
            const d = await cRes.json();
            createdClientId = d.id;
          }
        } catch { /* non-bloquant */ }
      }

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          quantity: q,
          unit_price_cents: pu,
          amount_cents: total,
          client_id: createdClientId,
          client_email: email,
          client_name: effectiveClient?.name ?? (clientName.trim() || null),
          client_siren: cleanSiren,
          client_address: effectiveClient?.address ?? (clientAddress.trim() || null),
          operation_type: operationType,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          send: action === "send",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création devis");

      const clientLabel = effectiveClient?.label || clientName.trim() || email;
      setSuccess({
        id: data.id,
        number: data.number,
        sent: action === "send",
        clientLabel,
        clientEmail: email,
        totalCents: total,
      });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  // ─── Success overlay ────────────────────────────────────────────
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

  const recapEmail = effectiveClient?.email || clientEmail;
  const recapName = effectiveClient?.label || clientName || "—";

  return (
    <div>
      <Stepper step={step} />

      {/* ============================== ÉTAPE 1 — Client ============================== */}
      {step === 1 ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-600" />
            <h2 className="text-h3">Pour qui est ce devis ?</h2>
          </div>

          {clients.length > 0 ? (
            <div className="inline-flex bg-surface-2 p-1 rounded-full">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={
                  "px-3.5 py-1.5 rounded-full text-small font-medium transition-all " +
                  (mode === "existing"
                    ? "bg-surface text-ink-900 shadow-hair"
                    : "text-ink-500 hover:text-ink-900")
                }
              >
                <Users size={14} className="inline mr-1.5 -mt-0.5" /> Client existant
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={
                  "px-3.5 py-1.5 rounded-full text-small font-medium transition-all " +
                  (mode === "manual"
                    ? "bg-surface text-ink-900 shadow-hair"
                    : "text-ink-500 hover:text-ink-900")
                }
              >
                <Plus size={14} className="inline mr-1.5 -mt-0.5" /> Nouveau client
              </button>
            </div>
          ) : null}

          {mode === "existing" && clients.length > 0 ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client…"
                  className="pl-9"
                />
              </div>
              <div className="max-h-72 overflow-y-auto -mx-2">
                {filteredClients.length === 0 ? (
                  <p className="text-small text-ink-500 px-2 py-4 text-center">
                    Aucun client ne correspond.
                  </p>
                ) : (
                  filteredClients.map((c) => {
                    const sel = c.id === pickedClientId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPickedClientId(c.id)}
                        className={
                          "w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-colors " +
                          (sel ? "bg-brand-500/10" : "hover:bg-surface-2")
                        }
                      >
                        <div className="grid place-items-center h-9 w-9 rounded-full bg-brand-500/10 text-brand-600 shrink-0">
                          {c.is_pro ? <Users size={14} /> : <User size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-small font-medium text-ink-900 truncate">{c.label}</div>
                          <div className="text-xs text-ink-500 truncate">{c.email}</div>
                        </div>
                        {sel ? <Check size={16} className="text-brand-600" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : null}

          {mode === "manual" || clients.length === 0 ? (
            <div className="space-y-4 pt-2">
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
                <EmailSuggestion email={clientEmail} onAccept={setClientEmail} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name" hint="optionnel">Nom / raison sociale</Label>
                  <Input
                    id="client_name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Société Dupont"
                  />
                </div>
                <div>
                  <Label htmlFor="client_siren" hint="9 chiffres si pro">SIREN</Label>
                  <Input
                    id="client_siren"
                    inputMode="numeric"
                    value={clientSiren}
                    onChange={(e) => setClientSiren(e.target.value)}
                    placeholder="123 456 789"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="client_address" hint="optionnel">Adresse client</Label>
                <Textarea
                  id="client_address"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="12 rue Léonard de Vinci&#10;75008 Paris"
                />
              </div>
              <label
                htmlFor="save_as_client"
                className="flex items-start gap-3 rounded-2xl bg-surface-2 border border-ink-100 p-3.5 cursor-pointer hover:bg-surface transition-colors"
              >
                <input
                  id="save_as_client"
                  type="checkbox"
                  checked={saveAsClient}
                  onChange={(e) => setSaveAsClient(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-small font-medium text-ink-900">
                    Enregistrer ce client dans mon carnet
                  </p>
                  <p className="text-xs text-ink-500">
                    Décoche pour un devis one-shot — le client ne sera pas ajouté à la liste.
                  </p>
                </div>
              </label>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* ============================== ÉTAPE 2 — Prestation ============================== */}
      {step === 2 ? (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <FileSignature size={16} className="text-brand-600" />
            <h2 className="text-h3">La prestation</h2>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="description">Description</Label>
              <button
                type="button"
                onClick={polishDescription}
                disabled={polishing || !description.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Améliore la formulation avec l'IA"
              >
                {polishing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                Améliorer avec l&apos;IA
              </button>
            </div>
            <Textarea
              id="description"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Refonte du site web — maquettes + intégration"
            />
            {polishError ? (
              <p className="mt-1.5 text-xs text-warn-600">{polishError}</p>
            ) : null}
            {polished ? (
              <div className="mt-2 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-3 space-y-2">
                <div className="text-xs font-medium text-brand-700 flex items-center gap-1">
                  <Wand2 size={12} /> Suggestion de l&apos;IA
                </div>
                <p className="text-small text-ink-800 whitespace-pre-wrap">{polished}</p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="primary" onClick={applyPolished}>
                    <Check size={14} /> Utiliser
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPolished(null)}
                    className="text-ink-500"
                  >
                    <X size={14} /> Ignorer
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
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
                onChange={(e) => setOperationType(e.target.value as OpType)}
                className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
              >
                <option value="service">Service</option>
                <option value="vente">Vente</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-surface-2 px-4 py-3 flex items-center justify-between">
            <span className="text-small text-ink-500 inline-flex items-center gap-1.5">
              <Euro size={14} /> Total HT
            </span>
            <span className="text-h3 tabular-nums tracking-tight">{formatEUR(amountCents)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valid_until" hint="par défaut +30 jours">
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

          <div>
            <Label htmlFor="notes" hint="visible uniquement par toi">Notes internes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Relancer le 15 mars si pas de réponse…"
            />
          </div>
        </Card>
      ) : null}

      {/* ============================== ÉTAPE 3 — Aperçu ============================== */}
      {step === 3 ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSignature size={16} className="text-brand-600" />
            <h2 className="text-h3">Relecture</h2>
          </div>

          {/* Récap rapide */}
          <div className="rounded-2xl bg-surface-2 p-4 space-y-2 text-small">
            <RecapRow label="Client" value={recapName} sub={recapEmail} />
            <RecapRow label="Prestation" value={description.trim() || "—"} />
            <RecapRow label="Total HT" value={formatEUR(amountCents)} />
            <RecapRow
              label="Validité"
              value={validUntil ? `jusqu'au ${formatFrDate(validUntil)}` : "—"}
            />
          </div>

          {/* Aperçu PDF */}
          <div className="surface p-0 overflow-hidden">
            <div className="px-4 py-3 text-small flex items-center justify-between">
              <span className="font-medium text-ink-700">Aperçu PDF</span>
              {previewLoading ? (
                <span className="inline-flex items-center gap-1.5 text-ink-500 text-xs">
                  <Loader2 size={12} className="animate-spin" /> Génération…
                </span>
              ) : null}
            </div>
            {previewError ? (
              <div className="p-6 text-small text-danger-600 bg-danger-500/5">
                {previewError}
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title="Aperçu devis"
                className="w-full h-[500px] bg-surface-2"
              />
            ) : (
              <div className="h-[500px] bg-surface-2 grid place-items-center text-ink-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* ─── Erreur générale ─── */}
      {error ? (
        <div className="mt-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 p-3.5 text-small text-danger-700">
          {error}
        </div>
      ) : null}

      {/* ─── Navigation ─── */}
      <div className="mt-5 flex items-center justify-between gap-2">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={goBack} disabled={busy !== null}>
            <ArrowLeft size={14} /> Précédent
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button type="button" onClick={tryAdvance}>
            Suivant <ArrowRight size={14} />
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => submit("save")}
              disabled={busy !== null}
            >
              {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer en brouillon
            </Button>
            <Button
              type="button"
              onClick={() => submit("send")}
              disabled={busy !== null || !gmailConnected}
              title={!gmailConnected ? "Gmail doit être connecté pour envoyer" : ""}
            >
              {busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Créer & envoyer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================== Stepper ==============================

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const STEPS = [
    { id: 1, label: "Client" },
    { id: 2, label: "Prestation" },
    { id: 3, label: "Relecture" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {STEPS.map((s) => {
        const done = s.id < step;
        const active = s.id === step;
        return (
          <div key={s.id} className="flex flex-col items-center gap-1.5">
            <div
              className={
                "h-9 w-9 grid place-items-center rounded-full transition-all text-small font-semibold " +
                (done
                  ? "bg-brand-500 text-white"
                  : active
                    ? "bg-brand-500 text-white shadow-pop"
                    : "bg-surface-2 text-ink-400")
              }
            >
              {done ? <Check size={16} /> : s.id}
            </div>
            <span
              className={
                "text-xs font-medium text-center " +
                (active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-400")
              }
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================== Recap row ==============================

function RecapRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span className="text-right text-ink-900 font-medium min-w-0 flex-1 break-words">
        {value}
        {sub ? <span className="block text-xs text-ink-500 font-normal break-all">{sub}</span> : null}
      </span>
    </div>
  );
}
