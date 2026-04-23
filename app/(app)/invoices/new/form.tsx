"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  if (success) {
    return <SuccessOverlay s={success} onClose={() => router.push(`/invoices/${success.id}`)} />;
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
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-gradient-subtle text-brand-700">
              <Users size={16} />
            </div>
            <div>
              <div className="font-semibold text-ink-900">Pour qui ?</div>
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
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                          active
                            ? "bg-brand-gradient-subtle ring-2 ring-inset ring-brand-400"
                            : "bg-white ring-1 ring-inset ring-ink-200 hover:ring-ink-300"
                        }`}
                      >
                        <div className="h-10 w-10 grid place-items-center rounded-full bg-white font-bold text-ink-700 ring-1 ring-inset ring-ink-200 shrink-0">
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
              <label className="md:col-span-2 flex items-center gap-2 cursor-pointer select-none rounded-xl bg-brand-gradient-subtle p-3 text-small">
                <input
                  type="checkbox"
                  checked={saveAsClient}
                  onChange={(e) => setSaveAsClient(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--brand-600,#6366f1)]"
                />
                <span className="text-ink-700">
                  <strong className="text-ink-900">Créer aussi comme client</strong>
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
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-gradient-subtle text-brand-700">
              <FileSignature size={16} />
            </div>
            <div>
              <div className="font-semibold text-ink-900">Détails de la facture</div>
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
              <div className="mt-3 rounded-2xl ring-1 ring-inset ring-brand-200 bg-brand-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 size={14} className="text-brand-600" />
                  <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Suggestion IA</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-ink-900 mb-1">Proposition</div>
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
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-small font-semibold text-white bg-brand-gradient shadow-pop"
                  >
                    <Check size={14} /> Utiliser
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPolished(null); setPolishError(null); }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-small font-semibold text-ink-600 bg-white ring-1 ring-inset ring-ink-200"
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
                className="h-12 w-full rounded-xl bg-white px-3 text-body shadow-hair focus:outline-none focus:ring-2 focus:ring-brand-400 focus:shadow-glow transition appearance-none"
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
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-brand-gradient-subtle text-brand-700">
              <BadgeCheck size={16} />
            </div>
            <div>
              <div className="font-semibold text-ink-900">Relecture</div>
              <div className="text-xs text-ink-500">Un coup d&apos;œil avant d&apos;envoyer.</div>
            </div>
          </div>

          {/* Total hero */}
          <div className="rounded-3xl p-5 md:p-6 bg-brand-gradient text-white shadow-pop">
            <div className="text-xs uppercase tracking-wide text-white/75">Montant</div>
            <div className="mt-1 text-[2rem] md:text-[2.4rem] font-extrabold tabular-nums leading-none">
              {formatEUR(amountCents)}
            </div>
            <div className="mt-2 text-small text-white/85">
              {kind === "prepaid" ? "Facture acquittée — déjà réglée par le client" : "Facture à régler par le client"}
            </div>
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
            <div className="rounded-xl bg-warn-50 ring-1 ring-inset ring-warn-200 p-3 text-small text-warn-700">
              Gmail pas connecté → tu ne pourras qu&apos;enregistrer en brouillon. Reconnecte-toi avec Google pour envoyer.
            </div>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl bg-danger-50 ring-1 ring-inset ring-danger-200 p-3 text-small text-danger-700">
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
          <div className="flex flex-col md:flex-row gap-2">
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
              className={`h-7 w-7 grid place-items-center rounded-full text-xs font-bold shrink-0 transition ${
                done
                  ? "bg-brand-gradient text-white"
                  : active
                    ? "bg-brand-gradient text-white shadow-pop"
                    : "bg-white ring-1 ring-inset ring-ink-200 text-ink-500"
              }`}
            >
              {done ? <Check size={14} /> : s.n}
            </div>
            <span className={`text-xs font-semibold ${active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-400"}`}>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-brand-gradient text-white shadow-pop"
          : "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ink-300 disabled:opacity-40"
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
      className={`text-left rounded-2xl p-3.5 ring-2 transition ${
        active
          ? "bg-brand-gradient-subtle ring-brand-400"
          : "bg-white ring-ink-200 ring-opacity-60 hover:ring-ink-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-8 w-8 grid place-items-center rounded-lg ${
            active ? "bg-brand-gradient text-white" : "bg-ink-50 text-ink-600"
          }`}
        >
          {icon}
        </div>
        <div className="font-semibold text-ink-900">{title}</div>
      </div>
      <p className="mt-1.5 text-xs text-ink-500 leading-snug">{body}</p>
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
    <div className="flex items-start gap-3 py-2 border-t border-ink-100 first:border-t-0">
      <div className="h-8 w-8 grid place-items-center rounded-lg bg-ink-50 text-ink-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</div>
        <div className="text-body text-ink-900 mt-0.5 break-words">{value || "—"}</div>
        {sub ? <div className="text-xs text-ink-500 mt-0.5 break-all">{sub}</div> : null}
      </div>
    </div>
  );
}

// ============================== Success overlay ==============================

function SuccessOverlay({
  s,
  onClose,
}: {
  s: {
    id: string;
    number: string;
    sent: boolean;
    prepaid: boolean;
    clientLabel: string;
    clientEmail: string;
    totalCents: number;
  };
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const title = s.prepaid
    ? "Facture acquittée émise"
    : s.sent
      ? "Facture envoyée"
      : "Brouillon enregistré";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-pop p-6 md:p-8 text-center">
        <div
          className={`mx-auto grid h-20 w-20 md:h-24 md:w-24 place-items-center rounded-full bg-brand-gradient text-white transition-transform duration-500 ${
            mounted ? "scale-100" : "scale-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
        >
          <Check size={48} strokeWidth={3.5} />
        </div>
        <h2 className="mt-5 text-h2 font-extrabold text-ink-900">{title}</h2>
        <p className="mt-1 text-small text-ink-500">N° {s.number}</p>

        <div className="mt-6 text-left rounded-2xl bg-ink-50 p-4 space-y-2.5">
          <MiniRow label="Client" value={s.clientLabel} sub={s.clientEmail} />
          <MiniRow label="Montant" value={formatEUR(s.totalCents)} />
          <MiniRow
            label="Statut"
            value={s.prepaid ? "Acquittée · paiement reçu" : s.sent ? "Envoyée par Gmail" : "Brouillon"}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onClose}>
            Voir la facture <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-small">
      <span className="text-ink-500">{label}</span>
      <span className="text-right text-ink-900 font-semibold min-w-0 flex-1 break-words">
        {value}
        {sub ? <span className="block text-xs text-ink-500 font-normal break-all">{sub}</span> : null}
      </span>
    </div>
  );
}
