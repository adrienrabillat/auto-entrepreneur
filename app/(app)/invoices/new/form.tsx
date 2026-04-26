"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmailSuggestion } from "@/components/ui/email-suggestion";
import { SuccessOverlay as SharedSuccessOverlay } from "@/components/ui/success-overlay";
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
  BadgeCheck,
} from "lucide-react";

type OpType = "service" | "vente" | "mixte";
type InvoiceKind = "to_pay" | "prepaid";

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

function formatEUR(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatFrDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewInvoiceForm({
  gmailConnected,
  clients,
}: {
  gmailConnected: boolean;
  clients: ClientOption[];
}) {
  const router = useRouter();

  // ---------- wizard state ----------
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 1 — client
  const [mode, setMode] = useState<"existing" | "manual">(clients.length ? "existing" : "manual");
  const [pickedClientId, setPickedClientId] = useState<string>(clients[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [saveAsClient, setSaveAsClient] = useState(true);

  // step 2 — invoice
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [operationType, setOperationType] = useState<OpType>("service");
  const [executionDate, setExecutionDate] = useState(todayIso());
  const [dueOn, setDueOn] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [discountTerms, setDiscountTerms] = useState("Néant");
  const [kind, setKind] = useState<InvoiceKind>("to_pay");

  // AI polish (step 2)
  const [polishing, setPolishing] = useState(false);
  const [polished, setPolished] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);

  // step 3 — submit
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    id: string;
    number: string;
    sent: boolean;
    prepaid: boolean;
    clientLabel: string;
    clientEmail: string;
    totalCents: number;
  }>(null);

  // step 3 — aperçu PDF temps réel
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ---------- derived ----------
  const effectiveClient = useMemo(() => {
    if (mode !== "existing") return null;
    return clients.find((c) => c.id === pickedClientId) ?? null;
  }, [mode, pickedClientId, clients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      (c.label + " " + c.email).toLowerCase().includes(q)
    );
  }, [search, clients]);

  const amountCents = useMemo(() => {
    const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0;
    const q = parseFloat(quantity.replace(",", ".")) || 1;
    return Math.round(pu * q);
  }, [unitPrice, quantity]);

  // ---------- aperçu PDF ----------
  // Quand on arrive à l'étape 3 (Relecture), on POST les valeurs actuelles
  // à /api/invoices/preview qui régénère le PDF sans rien écrire en base.
  // Le résultat est un blob transformé en ObjectURL et rendu en iframe.
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
          delivery_address: deliveryAddress.trim() || null,
          execution_date: executionDate || null,
          due_on: kind === "to_pay" ? (dueOn || null) : null,
          discount_terms: discountTerms.trim() || "Néant",
          prepaid: kind === "prepaid",
        };
        const res = await fetch("/api/invoices/preview", {
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
    // Les deps incluent tout ce qui change le PDF généré.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------- validation ----------
  function validateStep1(): string | null {
    if (mode === "existing") {
      if (!effectiveClient) return "Choisis un client ou passe en saisie manuelle.";
      return null;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail.trim())) return "Email du client invalide.";
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

  // ---------- AI polish ----------
  async function polishDescription() {
    const trimmed = description.trim();
    if (!trimmed) {
      setPolishError("Écris d'abord quelque chose à reformuler.");
      return;
    }
    setPolishing(true);
    setPolishError(null);
    setPolished(null);
    try {
      const res = await fetch("/api/ai/polish-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);
      const suggestion = String(payload.polished || "").trim();
      if (!suggestion) throw new Error("Réponse vide");
      if (suggestion === trimmed) {
        setPolishError("Le texte est déjà propre — rien à reformuler.");
      } else {
        setPolished(suggestion);
      }
    } catch (err) {
      setPolishError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setPolishing(false);
    }
  }

  // ---------- submit ----------
  async function submit(action: "save" | "send") {
    setBusy(action);
    setError(null);
    try {
      const q = parseFloat(quantity.replace(",", "."));
      const pu = Math.round(parseFloat(unitPrice.replace(",", ".")) * 100);
      const total = Math.round(pu * q);

      let email = clientEmail.trim();
      let name: string | null = clientName.trim() || null;
      let siren: string | null = clientSiren.replace(/\s/g, "") || null;
      let address: string | null = clientAddress.trim() || null;
      let client_id: string | null = null;
      let clientLabel = name || email;

      if (effectiveClient) {
        email = effectiveClient.email;
        name = effectiveClient.name;
        siren = effectiveClient.siren;
        address = effectiveClient.address;
        client_id = effectiveClient.id;
        clientLabel = effectiveClient.label;
      } else if (mode === "manual" && saveAsClient) {
        // Créer d'abord le client, puis poser la facture dessus.
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_pro: Boolean(siren),
            first_name: name ? name.split(" ")[0] : null,
            last_name: name ? name.split(" ").slice(1).join(" ") || null : null,
            company_name: siren ? name : null,
            siren,
            email,
            address_line1: address,
          }),
        });
        const payload = await res.json();
        if (res.ok) {
          client_id = payload.id;
        }
        // Si la création échoue on continue quand même avec les infos saisies.
      }

      const prepaid = kind === "prepaid";

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
          prepaid,
          send: action === "send",
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);

      setSuccess({
        id: payload.id,
        number: payload.number,
        sent: action === "send",
        prepaid,
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

  // ---------- success overlay ----------
  // Modal partagé via components/ui/success-overlay — même look que pour
  // les devis et les clients pour garder l'uniformité entre modules.
  if (success) {
    const title = success.prepaid
      ? "Facture acquittée émise"
      : success.sent
        ? "Facture envoyée"
        : "Brouillon enregistré";
    const statusLabel = success.prepaid
      ? "Acquittée · paiement reçu"
      : success.sent
        ? "Envoyée par Gmail"
        : "Brouillon";
    return (
      <SharedSuccessOverlay
        title={title}
        subtitle={`N° ${success.number}`}
        rows={[
          { label: "Client", value: success.clientLabel, sub: success.clientEmail },
          { label: "Montant", value: formatEUR(success.totalCents) },
          { label: "Statut", value: statusLabel },
        ]}
        cta={{
          label: "Voir la facture",
          onClick: () => router.push(`/invoices/${success.id}`),
        }}
      />
    );
  }

  const recapEmail = effectiveClient?.email || clientEmail;
  const recapName = effectiveClient?.label || clientName || "—";

  return (
    <div>
      <Stepper step={step} />

      {/* ============================== STEP 1 — Client ============================== */}
      {step === 1 ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-500/10 text-brand-600">
              <Users size={16} />
            </div>
            <div>
              <div className="font-medium text-ink-900">Pour qui ?</div>
              <div className="text-xs text-ink-500">Choisis un client existant ou saisis ses infos à la main.</div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <ToggleChip
              active={mode === "existing"}
              disabled={clients.length === 0}
              onClick={() => setMode("existing")}
              icon={<Users size={14} />}
              label={`Mes clients (${clients.length})`}
            />
            <ToggleChip
              active={mode === "manual"}
              onClick={() => setMode("manual")}
              icon={<User size={14} />}
              label="Saisir à la main"
            />
          </div>

          {mode === "existing" ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client…"
                  className="pl-10"
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto -mx-2 px-2 space-y-1.5">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-small text-ink-500">
                    Aucun client trouvé.{" "}
                    <Link href="/clients/new" className="text-brand-600 font-semibold">
                      Créer un client
                    </Link>
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const active = c.id === pickedClientId;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setPickedClientId(c.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                          active
                            ? "bg-brand-500/10 shadow-hair"
                            : "bg-surface shadow-hair hover:bg-surface-2"
                        }`}
                      >
                        <div className="avatar shrink-0">
                          {(c.label?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-ink-900 truncate">{c.label}</div>
                          <div className="text-xs text-ink-500 truncate">
                            {c.email}
                            {c.is_pro ? " · Pro" : " · Particulier"}
                          </div>
                        </div>
                        {active ? <Check size={18} className="text-brand-600 shrink-0" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between items-center pt-2 text-xs">
                <Link href="/clients/new" className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                  <Plus size={14} /> Nouveau client
                </Link>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="client_name" hint="optionnel — nom du pro ou du particulier">Nom</Label>
                <Input id="client_name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <EmailSuggestion email={clientEmail} onAccept={(fixed) => setClientEmail(fixed)} />
              </div>
              <div>
                <Label htmlFor="client_siren" hint="si pro">SIREN</Label>
                <Input
                  id="client_siren"
                  inputMode="numeric"
                  value={clientSiren}
                  onChange={(e) => setClientSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="client_address" hint="optionnel">Adresse</Label>
                <Textarea
                  id="client_address"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
              <label className="md:col-span-2 flex items-center gap-2 cursor-pointer select-none rounded-2xl bg-surface-2 p-3.5 text-small">
                <input
                  type="checkbox"
                  checked={saveAsClient}
                  onChange={(e) => setSaveAsClient(e.target.checked)}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="text-ink-700">
                  <strong className="text-ink-900 font-medium">Créer aussi comme client</strong>
                  <span className="text-ink-500 ml-1">· pour le retrouver en un clic la prochaine fois</span>
                </span>
              </label>
            </div>
          )}
        </Card>
      ) : null}

      {/* ============================== STEP 2 — Détails ============================== */}
      {step === 2 ? (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-500/10 text-brand-600">
              <FileSignature size={16} />
            </div>
            <div>
              <div className="font-medium text-ink-900">Détails de la facture</div>
              <div className="text-xs text-ink-500">Prestation, montant, dates.</div>
            </div>
          </div>

          {/* Type de facture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <TypeCard
              active={kind === "to_pay"}
              onClick={() => setKind("to_pay")}
              icon={<Send size={16} />}
              title="À payer"
              body="Facture classique. Le client reçoit le PDF par email et paie par virement."
            />
            <TypeCard
              active={kind === "prepaid"}
              onClick={() => setKind("prepaid")}
              icon={<BadgeCheck size={16} />}
              title="Déjà payée (acquittée)"
              body="Le client a déjà réglé. La facture est émise avec la mention « ACQUITTÉE »."
            />
          </div>

          {/* Description + IA */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Label htmlFor="description">Description</Label>
              <button
                type="button"
                onClick={polishDescription}
                disabled={polishing || !description.trim()}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white bg-brand-gradient shadow-pop hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {polishing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {polishing ? "Analyse…" : "Améliorer IA"}
              </button>
            </div>
            <Textarea
              id="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {polishError ? <p className="mt-2 text-xs text-danger-600">{polishError}</p> : null}
            {polished ? (
              <div className="mt-3 rounded-2xl bg-surface-2 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 size={14} className="text-brand-600" />
                  <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">Suggestion IA</span>
                </div>
                <div>
                  <div className="text-xs font-medium text-ink-900 mb-1">Proposition</div>
                  <p className="text-small text-ink-900 whitespace-pre-wrap">{polished}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (polished) setDescription(polished);
                      setPolished(null);
                      setPolishError(null);
                    }}
                    className="pill pill-primary text-xs py-1.5 px-3.5"
                  >
                    <Check size={14} /> Utiliser
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPolished(null); setPolishError(null); }}
                    className="pill pill-ghost text-xs py-1.5 px-3.5"
                  >
                    <X size={14} /> Ignorer
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quantité / prix / total */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div>
              <Label htmlFor="quantity">Qté</Label>
              <Input
                id="quantity"
                required
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit_price" hint="€ HT">PU</Label>
              <Input
                id="unit_price"
                required
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="total" hint="calculé">Total</Label>
              <Input id="total" disabled value={amountCents > 0 ? formatEUR(amountCents) : ""} />
            </div>
          </div>

          {/* Nature + dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="operation_type">Nature</Label>
              <select
                id="operation_type"
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as OpType)}
                className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
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
            {kind === "to_pay" ? (
              <div>
                <Label htmlFor="due_on" hint="optionnel">Échéance</Label>
                <Input
                  id="due_on"
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <Label hint="masqué — facture acquittée">Échéance</Label>
                <Input disabled value="Réglée" />
              </div>
            )}
          </div>

          {operationType !== "service" ? (
            <div>
              <Label htmlFor="delivery_address" hint="si différente de la facturation">Adresse de livraison</Label>
              <Textarea id="delivery_address" rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
          ) : null}

          <div>
            <Label htmlFor="discount_terms" hint="URSSAF : mention obligatoire">Conditions d&apos;escompte</Label>
            <Input id="discount_terms" value={discountTerms} onChange={(e) => setDiscountTerms(e.target.value)} />
          </div>
        </Card>
      ) : null}

      {/* ============================== STEP 3 — Récap ============================== */}
      {step === 3 ? (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-500/10 text-brand-600">
              <BadgeCheck size={16} />
            </div>
            <div>
              <div className="font-medium text-ink-900">Relecture</div>
              <div className="text-xs text-ink-500">Un coup d&apos;œil avant d&apos;envoyer.</div>
            </div>
          </div>

          {/* Total hero — en surface (blanc/dark) avec chiffre XL */}
          <div className="relative overflow-hidden rounded-2xl bg-surface-2 p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full"
              style={{ background: "radial-gradient(circle at center, var(--accent-soft) 0%, transparent 65%)" }}
            />
            <div className="relative">
              <div className="text-xs uppercase tracking-wide text-ink-500">Montant</div>
              <div
                className="mt-1 font-bold tabular-nums tracking-[-0.035em] leading-none text-ink-900"
                style={{ fontSize: "clamp(36px, 5vw, 52px)" }}
              >
                {formatEUR(amountCents)}
              </div>
              <div className="mt-2 text-small text-ink-500">
                {kind === "prepaid" ? "Facture acquittée — déjà réglée par le client" : "Facture à régler par le client"}
              </div>
            </div>
          </div>

          {/* Aperçu PDF — régénéré à l'entrée dans l'étape 3 */}
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">Aperçu du PDF</div>
            {previewLoading ? (
              <div className="rounded-2xl bg-surface-2 h-[420px] md:h-[520px] grid place-items-center animate-pulse">
                <div className="flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={16} className="animate-spin" />
                  Génération de l&apos;aperçu…
                </div>
              </div>
            ) : previewError ? (
              <div className="rounded-2xl bg-danger-500/10 p-4 text-small text-danger-600">
                {previewError}
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title="Aperçu de la facture"
                className="w-full h-[420px] md:h-[520px] rounded-2xl bg-surface-2"
              />
            ) : null}
          </div>

          {/* Récap blocks */}
          <RecapRow icon={<User size={14} />} label="Client" value={recapName} sub={recapEmail} />
          <RecapRow icon={<FileSignature size={14} />} label="Prestation" value={description} />
          <RecapRow
            icon={<Euro size={14} />}
            label="Détail"
            value={`${quantity} × ${formatEUR(Math.round(parseFloat(unitPrice.replace(",", ".")) * 100) || 0)}`}
          />
          <RecapRow
            icon={<CalendarDays size={14} />}
            label="Dates"
            value={`Émise ${formatFrDate(todayIso())}${executionDate ? ` · exécutée ${formatFrDate(executionDate)}` : ""}${dueOn && kind === "to_pay" ? ` · échue ${formatFrDate(dueOn)}` : ""}`}
          />

          {!gmailConnected && kind === "to_pay" ? (
            <div className="rounded-2xl bg-warn-500/10 p-3.5 text-small text-warn-600">
              Gmail pas connecté → tu ne pourras qu&apos;enregistrer en brouillon. Reconnecte-toi avec Google pour envoyer.
            </div>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl bg-danger-500/10 p-3.5 text-small text-danger-600">
          {error}
        </div>
      ) : null}

      {/* ============================== Nav buttons ============================== */}
      <div className="mt-6 flex items-center justify-between gap-2">
        {step > 1 ? (
          <Button variant="secondary" type="button" onClick={goBack} disabled={busy !== null}>
            <ArrowLeft size={14} /> Précédent
          </Button>
        ) : (
          <Link href="/invoices" className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600">
            <ArrowLeft size={14} /> Annuler
          </Link>
        )}
        {step < 3 ? (
          <Button type="button" onClick={tryAdvance}>
            Suivant <ArrowRight size={14} />
          </Button>
        ) : (
          // Mobile : l'action primaire "Créer & envoyer" apparaît en haut
          // (flex-col-reverse), Brouillon juste en dessous et centré.
          // Desktop (md:) : rangée classique Brouillon puis primaire.
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row md:items-center">
            <Button variant="secondary" type="button" onClick={() => submit("save")} disabled={busy !== null}>
              {busy === "save" ? "Enregistrement…" : "Brouillon"}
            </Button>
            <Button type="button" onClick={() => submit("send")} disabled={busy !== null || !gmailConnected}>
              {busy === "send" ? (
                <><Loader2 size={14} className="animate-spin" /> Envoi…</>
              ) : (
                <><Send size={14} /> {kind === "prepaid" ? "Envoyer le justificatif" : "Créer & envoyer"}</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================== sub-components ==============================

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Client" },
    { n: 2, label: "Détails" },
    { n: 3, label: "Confirmer" },
  ];
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2">
      {steps.map((s) => {
        const done = s.n < step;
        const active = s.n === step;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 grid place-items-center rounded-full text-xs font-semibold shrink-0 transition-all ${
                done
                  ? "bg-brand-500 text-white"
                  : active
                    ? "bg-brand-500 text-white shadow-pop"
                    : "bg-surface-2 text-ink-500"
              }`}
            >
              {done ? <Check size={14} /> : s.n}
            </div>
            <span className={`text-xs font-medium ${active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-400"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ToggleChip({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-brand-500 text-white shadow-pop"
          : "bg-surface-2 text-ink-700 hover:bg-brand-500/10 hover:text-brand-600 disabled:opacity-40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl p-4 transition-all ${
        active
          ? "bg-brand-500/10 shadow-hair"
          : "bg-surface shadow-hair hover:bg-surface-2"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`h-9 w-9 grid place-items-center rounded-xl ${
            active ? "bg-brand-500 text-white shadow-pop" : "bg-surface-2 text-ink-600"
          }`}
        >
          {icon}
        </div>
        <div className="font-medium text-ink-900">{title}</div>
      </div>
      <p className="mt-2 text-xs text-ink-500 leading-snug">{body}</p>
    </button>
  );
}

function RecapRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0">
      <div className="h-8 w-8 grid place-items-center rounded-xl bg-surface-2 text-ink-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
        <div className="text-body text-ink-900 mt-0.5 break-words">{value || "—"}</div>
        {sub ? <div className="text-xs text-ink-500 mt-0.5 break-all">{sub}</div> : null}
      </div>
    </div>
  );
}

// SuccessOverlay extrait dans components/ui/success-overlay.tsx pour
// pouvoir être réutilisé identique par les formulaires devis et clients.
