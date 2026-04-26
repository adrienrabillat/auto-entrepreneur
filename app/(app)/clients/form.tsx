"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { EmailSuggestion } from "@/components/ui/email-suggestion";
import { SuccessOverlay } from "@/components/ui/success-overlay";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { lookupSiren } from "@/lib/sirene";

type Values = {
  is_pro: boolean;
  first_name: string;
  last_name: string;
  company_name: string;
  siren: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
  notes: string;
};

const EMPTY: Values = {
  is_pro: false,
  first_name: "",
  last_name: "",
  company_name: "",
  siren: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "France",
  notes: "",
};

export function ClientForm({
  mode,
  clientId,
  defaultValues,
}: {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: Values;
}) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modal de confirmation post-création (mêmes patterns que pour les
  // factures et devis pour l'uniformité visuelle entre modules). On ne
  // l'affiche qu'en mode 'create' — en mode 'edit' on retourne directement
  // à la liste sans modal.
  const [success, setSuccess] = useState<{ id: string; label: string } | null>(null);

  // SIREN auto-fill : écrase les champs entreprise à chaque nouveau SIREN
  // valide. On mémorise le dernier SIREN résolu pour ne pas re-fetcher
  // inutilement (et ne pas écraser les éditions manuelles faites APRÈS
  // le remplissage auto).
  const [sirenStatus, setSirenStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const lastResolvedSirenRef = useRef<string>(defaultValues?.siren?.replace(/\D/g, "") ?? "");

  useEffect(() => {
    if (!v.is_pro) return;
    const clean = v.siren.replace(/\D/g, "");
    if (clean.length !== 9) {
      if (sirenStatus !== "idle") setSirenStatus("idle");
      return;
    }
    // Même SIREN qu'avant → on ne réinterroge pas, l'utilisateur est peut-être
    // en train d'éditer les champs à la main après un premier remplissage.
    if (clean === lastResolvedSirenRef.current) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSirenStatus("loading");
    lookupSiren(clean, ctrl.signal).then((company) => {
      if (ctrl.signal.aborted) return;
      if (!company) {
        setSirenStatus("not_found");
        return;
      }
      // Écrase les champs entreprise avec les valeurs officielles du Sirene.
      // L'utilisateur peut ensuite éditer librement — on ne re-fetch plus
      // tant qu'il ne change pas le SIREN.
      setV((prev) => ({
        ...prev,
        company_name: company.name,
        address_line1: company.addressLine1 ?? "",
        postal_code: company.postalCode ?? "",
        city: company.city ?? "",
      }));
      lastResolvedSirenRef.current = clean;
      setSirenStatus("found");
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.is_pro, v.siren]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) {
        throw new Error("Email invalide");
      }
      const cleanSiren = v.siren.replace(/\s/g, "");
      if (v.is_pro && cleanSiren && !/^\d{9}$/.test(cleanSiren)) {
        throw new Error("SIREN client : 9 chiffres attendus");
      }
      const body = { ...v, siren: cleanSiren };
      const url = mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);
      // En création : on affiche le modal de confirmation et l'user
      // décide de la suite (voir le client ou retour à la liste). En
      // édition : redirect direct vers la liste, pas de modal (l'user
      // sait déjà ce qu'il a modifié).
      if (mode === "create") {
        const label = v.is_pro
          ? (v.company_name.trim() || `${v.first_name} ${v.last_name}`.trim() || v.email.trim())
          : (`${v.first_name} ${v.last_name}`.trim() || v.email.trim());
        setSuccess({ id: payload.id, label });
      } else {
        router.push("/clients");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setBusy(false);
    }
  }

  // Modal de confirmation : remplace tout le formulaire une fois le client
  // créé avec succès. L'user peut soit retourner à la liste, soit aller
  // directement voir la fiche du client qu'il vient de créer.
  if (success) {
    return (
      <SuccessOverlay
        title="Client ajouté"
        subtitle={success.label}
        rows={[
          { label: "Email", value: v.email.trim() },
          {
            label: "Type",
            value: v.is_pro ? "Professionnel" : "Particulier",
          },
          ...(v.city.trim()
            ? [{ label: "Ville", value: v.city.trim() }]
            : []),
        ]}
        cta={{
          label: "Voir la fiche client",
          onClick: () => {
            router.push(`/clients/${success.id}`);
            router.refresh();
          },
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="space-y-5">
        <div>
          <Label htmlFor="is_pro">Type de client</Label>
          <div className="inline-flex bg-surface-2 p-1 rounded-full w-full">
            <button
              type="button"
              onClick={() => setV({ ...v, is_pro: false })}
              className={
                !v.is_pro
                  ? "flex-1 h-10 rounded-full bg-surface text-ink-900 shadow-hair text-small font-medium"
                  : "flex-1 h-10 rounded-full text-ink-500 hover:text-ink-900 text-small font-medium transition-colors"
              }
            >
              Particulier
            </button>
            <button
              type="button"
              onClick={() => setV({ ...v, is_pro: true })}
              className={
                v.is_pro
                  ? "flex-1 h-10 rounded-full bg-surface text-ink-900 shadow-hair text-small font-medium"
                  : "flex-1 h-10 rounded-full text-ink-500 hover:text-ink-900 text-small font-medium transition-colors"
              }
            >
              Professionnel
            </button>
          </div>
        </div>

        {v.is_pro ? (
          <>
            {/* SIREN en TOUT premier — pré-remplit raison sociale + adresse */}
            <div>
              <Label htmlFor="siren" hint="9 chiffres — on remplit le reste automatiquement">SIREN</Label>
              <div className="relative">
                <Input
                  id="siren"
                  inputMode="numeric"
                  value={v.siren}
                  onChange={(e) => setV({ ...v, siren: e.target.value.replace(/\D/g, "").slice(0, 9) })}
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
                <p className="mt-1.5 text-xs text-warn-600">SIREN introuvable — tu peux saisir les infos à la main ci-dessous.</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="company_name">Raison sociale</Label>
              <Input
                id="company_name"
                required
                value={v.company_name}
                onChange={(e) => setV({ ...v, company_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" hint="optionnel">Prénom du contact</Label>
                <Input id="first_name" value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="last_name" hint="optionnel">Nom du contact</Label>
                <Input id="last_name" value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" required value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" required value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
            <EmailSuggestion email={v.email} onAccept={(fixed) => setV({ ...v, email: fixed })} />
          </div>
          <div>
            <Label htmlFor="phone" hint="optionnel">Téléphone</Label>
            <Input id="phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address_line1" hint="obligatoire pour un pro">Adresse</Label>
            <AddressAutocomplete
              id="address_line1"
              value={v.address_line1}
              onChange={(val) => setV({ ...v, address_line1: val })}
              onSelect={(s) => setV({ ...v, address_line1: s.addressLine1, postal_code: s.postalCode, city: s.city })}
              placeholder="Rechercher une adresse…"
            />
          </div>
          <div className="md:col-span-2">
            <Input aria-label="Complément" value={v.address_line2} onChange={(e) => setV({ ...v, address_line2: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="postal_code">Code postal</Label>
            <Input id="postal_code" value={v.postal_code} onChange={(e) => setV({ ...v, postal_code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </div>
        </div>

        <div>
          <Label htmlFor="notes" hint="optionnel">Notes internes</Label>
          <Textarea id="notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </div>

        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : mode === "create" ? "Créer le client" : "Enregistrer"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
