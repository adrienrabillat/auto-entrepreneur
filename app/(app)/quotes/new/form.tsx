"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { EmailSuggestion } from "@/components/ui/email-suggestion";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { SuccessOverlay } from "@/components/ui/success-overlay";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { lookupSiren } from "@/lib/sirene";
import {
  AlertCircle,
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
 * Recompose les 3 sous-champs adresse en une chaîne multi-ligne identique
 * à celle produite par buildAddress() côté page parente (clients existants).
 * Le PDF (lib/pdf.ts) attend un split sur \n pour séparer rue / CP+ville.
 * Retourne null si aucun champ n'est rempli.
 */
function composeManualAddress(
  line1: string,
  postalCode: string,
  city: string,
): string | null {
  const lines = [
    line1.trim() || null,
    [postalCode.trim() || null, city.trim() || null].filter(Boolean).join(" ") || null,
  ].filter(Boolean) as string[];
  return lines.length ? lines.join("\n") : null;
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
  // Adresse client en saisie manuelle — éclatée en 3 champs structurés pour
  // (a) auto-remplir depuis l'API SIRENE quand un SIREN valide est saisi et
  // (b) imposer chaque sous-champ obligatoire pour un client pro (URSSAF +
  // Factur-X exigent une adresse complète sur les documents B2B).
  const [clientAddressLine1, setClientAddressLine1] = useState("");
  const [clientPostalCode, setClientPostalCode] = useState("");
  const [clientCity, setClientCity] = useState("");
  // "Enregistrer ce client dans mon carnet" — coché par défaut quand l'user
  // est en saisie manuelle. Décocher = devis one-shot, on ne crée pas la fiche.
  const [saveAsClient, setSaveAsClient] = useState(true);

  // SIREN auto-fill côté wizard — strictement le même pattern que dans
  // app/(app)/clients/form.tsx : sirenStatus pour l'icône d'état, AbortController
  // pour annuler la requête en cours quand on retape, lastResolvedSirenRef
  // pour ne pas écraser les éditions manuelles faites APRÈS l'auto-fill.
  const [sirenStatus, setSirenStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const sirenAbortRef = useRef<AbortController | null>(null);
  const lastResolvedSirenRef = useRef<string>("");

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

  // Un SIREN renseigné = client professionnel → adresse complète obligatoire.
  // Cette dérivation pilote à la fois la validation (validateStep1) et le
  // rendu (champs marqués required + libellé "obligatoire pour un pro").
  const isManualPro = mode === "manual" && /^\d{9}$/.test(clientSiren.replace(/\D/g, ""));

  // ─── SIREN auto-fill (saisie manuelle uniquement) ─────────────────
  // Comportement identique à la fiche client (cf. app/(app)/clients/form.tsx) :
  // dès qu'un SIREN à 9 chiffres est saisi, on interroge l'API publique
  // Recherche d'entreprises pour pré-remplir raison sociale + adresse siège.
  // L'utilisateur peut ensuite éditer librement — on ne re-fetch plus tant
  // qu'il ne change pas le SIREN, pour ne pas écraser ses corrections.
  useEffect(() => {
    if (mode !== "manual") return;
    const clean = clientSiren.replace(/\D/g, "");
    if (clean.length !== 9) {
      if (sirenStatus !== "idle") setSirenStatus("idle");
      return;
    }
    if (clean === lastResolvedSirenRef.current) return;

    sirenAbortRef.current?.abort();
    const ctrl = new AbortController();
    sirenAbortRef.current = ctrl;

    setSirenStatus("loading");
    lookupSiren(clean, ctrl.signal).then((company) => {
      if (ctrl.signal.aborted) return;
      if (!company) {
        setSirenStatus("not_found");
        return;
      }
      setClientName((prev) => prev.trim() ? prev : company.name);
      setClientAddressLine1(company.addressLine1 ?? "");
      setClientPostalCode(company.postalCode ?? "");
      setClientCity(company.city ?? "");
      lastResolvedSirenRef.current = clean;
      setSirenStatus("found");
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clientSiren]);

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
          client_address: effectiveClient?.address ?? composeManualAddress(clientAddressLine1, clientPostalCode, clientCity),
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
    // Client pro = adresse complète obligatoire. URSSAF + Factur-X exigent
    // raison sociale + adresse complète sur le devis B2B (le devis devient
    // facture en cas d'acceptation, donc autant exiger les mêmes mentions
    // dès maintenant).
    if (isManualPro) {
      if (!clientName.trim()) return "Raison sociale obligatoire pour un client pro.";
      if (!clientAddressLine1.trim()) return "Adresse obligatoire pour un client pro.";
      if (!clientPostalCode.trim()) return "Code postal obligatoire pour un client pro.";
      if (!clientCity.trim()) return "Ville obligatoire pour un client pro.";
    }
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
  // Strictement identique à la fonction côté factures pour avoir le même
  // comportement (gestion d'erreur, message "déjà propre", etc.).
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

      // Résolution client : on prépare les valeurs finales qui partiront
      // sur l'API quotes (et éventuellement clients si on doit créer).
      // Variables miroir de celles utilisées dans le submit factures —
      // structure strictement identique pour garantir que les deux flows
      // produisent les MÊMES enregistrements clients (essentiel pour la
      // compatibilité Factur-X qui s'appuie sur is_pro + siren côté client).
      let email = clientEmail.trim();
      let name: string | null = clientName.trim() || null;
      let siren: string | null = clientSiren.replace(/\s/g, "") || null;
      // Adresse manuelle : on recompose la chaîne multi-ligne attendue par
      // l'API devis et le générateur PDF (lib/pdf.ts split sur \n).
      let address: string | null = composeManualAddress(clientAddressLine1, clientPostalCode, clientCity);
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
        // Création du client si demandé (mode manuel + checkbox cochée).
        // Payload IDENTIQUE à celui du submit factures (cf. invoices/new/form.tsx) :
        //   - is_pro = Boolean(siren) → un client avec SIREN est typé pro
        //   - first_name / last_name extraits par split(" ") seulement si pas pro
        //   - company_name = name si pro (raison sociale), null sinon
        //   - address_line1 / postal_code / city envoyés en clair pour que la
        //     fiche client résultante soit propre et réutilisable (le formulaire
        //     fiche client lit ces 3 champs séparés, pas une chaîne agrégée).
        // Cette combinaison garantit Factur-X compatible (l'XML requiert
        // BuyerTradeParty.LegalRegistration.ID = SIREN, BuyerTradeParty.Name =
        // company_name, et BuyerTradeParty.PostalTradeAddress avec rue/CP/ville).
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_pro: Boolean(siren),
            first_name: name && !siren ? name.split(" ")[0] : null,
            last_name: name && !siren ? (name.split(" ").slice(1).join(" ") || null) : null,
            company_name: siren ? name : null,
            siren,
            email,
            address_line1: clientAddressLine1.trim() || null,
            postal_code: clientPostalCode.trim() || null,
            city: clientCity.trim() || null,
          }),
        });
        const payload = await res.json();
        if (res.ok) {
          client_id = payload.id;
        }
        // Si la création échoue on continue quand même avec les infos saisies —
        // le devis a la priorité sur l'enregistrement carnet.
      }

      const res = await fetch("/api/quotes", {
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
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          send: action === "send",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création devis");

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

      {/* ============================== ÉTAPE 1 — Client ==============================
          UX strictement identique à la création de facture (mêmes
          composants ToggleChip, EmailSuggestion, mêmes labels, même ordre
          de champs). Seul changement : "ce devis" au lieu de "cette facture"
          dans le sous-titre. Tout est partagé via components/ui/ donc une
          modif visuelle ici se propage à l'autre flow. */}
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
                        className={
                          "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all " +
                          (active
                            ? "bg-brand-500/10 shadow-hair"
                            : "bg-surface shadow-hair hover:bg-surface-2")
                        }
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
              {/* SIREN en tête du bloc — saisie en premier déclenche l'auto-fill
                  raison sociale + adresse via lib/sirene.ts, exactement comme
                  sur la fiche client. Optionnel : si vide, le client est traité
                  comme un particulier et l'adresse n'est plus obligatoire. */}
              <div className="md:col-span-2">
                <Label htmlFor="client_siren" hint="si pro — on remplit le reste automatiquement">SIREN</Label>
                <div className="relative">
                  <Input
                    id="client_siren"
                    inputMode="numeric"
                    value={clientSiren}
                    onChange={(e) => setClientSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="pr-10"
                  />
                  {sirenStatus === "loading" ? (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 animate-spin" />
                  ) : sirenStatus === "found" ? (
                    <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success-600" />
                  ) : sirenStatus === "not_found" ? (
                    <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-warn-600" />
                  ) : null}
                </div>
                {sirenStatus === "found" ? (
                  <p className="mt-1.5 text-xs text-success-600">Entreprise trouvée, infos remplies automatiquement.</p>
                ) : sirenStatus === "not_found" ? (
                  <p className="mt-1.5 text-xs text-warn-600">SIREN introuvable — saisis l&apos;adresse à la main ci-dessous.</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="client_name" hint={isManualPro ? "raison sociale — obligatoire" : "optionnel — nom du pro ou du particulier"}>
                  {isManualPro ? "Raison sociale" : "Nom"}
                </Label>
                <Input
                  id="client_name"
                  required={isManualPro}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
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
              {/* Adresse éclatée — obligatoire dès qu'un SIREN est renseigné.
                  Mentions URSSAF + Factur-X B2B exigent rue + CP + ville sur le
                  devis (qui se transforme en facture en cas d'acceptation). La
                  ligne 1 est branchée sur la Base Adresse Nationale (cf.
                  components/ui/address-autocomplete.tsx) — suggestions au fil
                  de la frappe, CP + ville remplis d'un clic. */}
              <div className="md:col-span-2">
                <Label htmlFor="client_address_line1" hint={isManualPro ? "obligatoire pour un pro" : "optionnel"}>
                  Adresse
                </Label>
                <AddressAutocomplete
                  id="client_address_line1"
                  required={isManualPro}
                  value={clientAddressLine1}
                  onChange={(val) => setClientAddressLine1(val)}
                  onSelect={(s) => {
                    setClientAddressLine1(s.addressLine1);
                    setClientPostalCode(s.postalCode);
                    setClientCity(s.city);
                  }}
                  placeholder="N° et rue — recherche BAN…"
                />
              </div>
              <div>
                <Label htmlFor="client_postal_code" hint={isManualPro ? "obligatoire" : "optionnel"}>Code postal</Label>
                <Input
                  id="client_postal_code"
                  required={isManualPro}
                  value={clientPostalCode}
                  onChange={(e) => setClientPostalCode(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="client_city" hint={isManualPro ? "obligatoire" : "optionnel"}>Ville</Label>
                <Input
                  id="client_city"
                  required={isManualPro}
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
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

      {/* ============================== ÉTAPE 2 — Prestation ============================== */}
      {step === 2 ? (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <FileSignature size={16} className="text-brand-600" />
            <h2 className="text-h3">La prestation</h2>
          </div>

          {/* Description + IA — UI strictement identique à la création de
              facture pour cohérence totale entre modules. */}
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
              placeholder="Refonte du site web — maquettes + intégration"
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
