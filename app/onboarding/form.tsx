"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Loader2, Check, AlertCircle, ArrowLeft, ArrowRight, User, Building2, MapPin, Landmark } from "lucide-react";
import { lookupSiren } from "@/lib/sirene";
import { identifyBank } from "@/lib/iban-banks";
import { createClient } from "@/lib/supabase/browser";

type LegalForm = "EI" | "EURL" | "SARL" | "SAS" | "SASU" | "SA" | "SCI" | "Autre";

type Values = {
  display_name: string;
  business_name: string;
  legal_form: LegalForm;
  metier: string;
  siren: string;
  siret: string;
  ape_naf: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  iban: string;
  bic: string;
};

type StepId = 1 | 2 | 3 | 4;

const STEPS: { id: StepId; label: string; icon: typeof User }[] = [
  { id: 1, label: "Identité",   icon: User },
  { id: 2, label: "Entreprise", icon: Building2 },
  { id: 3, label: "Adresse",    icon: MapPin },
  { id: 4, label: "Bancaire",   icon: Landmark },
];

export function OnboardingForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SIRET auto-fill — déclenché à l'étape 2
  const [sirenStatus, setSirenStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const lastResolvedSirenRef = useRef<string>(defaultValues.siren?.replace(/\D/g, "") ?? "");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clean = v.siren.replace(/\D/g, "");
    if (clean.length !== 9) {
      if (sirenStatus !== "idle") setSirenStatus("idle");
      return;
    }
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
      setV((prev) => ({
        ...prev,
        legal_form: company.legalFormNormalized || prev.legal_form,
        business_name: company.name || prev.business_name,
        metier: company.activityLabel || prev.metier,
        ape_naf: company.apeNaf || prev.ape_naf,
        address_line1: company.addressLine1 || prev.address_line1,
        postal_code: company.postalCode || prev.postal_code,
        city: company.city || prev.city,
      }));
      lastResolvedSirenRef.current = clean;
      setSirenStatus("found");
    });
    return () => ctrl.abort();
  }, [v.siren, sirenStatus]);

  function onSiretChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    const auto = digits.length >= 9 ? digits.slice(0, 9) : v.siren;
    setV({ ...v, siret: digits, siren: /^\d{9}$/.test(auto) ? auto : v.siren });
  }

  // ─── Validation par étape ───────────────────────────────────────────
  function validateStep(s: StepId): string | null {
    if (s === 1) {
      if (!v.display_name.trim()) return "Indique ton nom et prénom.";
      return null;
    }
    if (s === 2) {
      const cleanSiren = v.siren.replace(/\s/g, "");
      const cleanSiret = v.siret.replace(/\s/g, "");
      if (!/^\d{9}$/.test(cleanSiren)) return "SIREN : 9 chiffres attendus.";
      if (!/^\d{14}$/.test(cleanSiret)) return "SIRET : 14 chiffres attendus.";
      if (!cleanSiret.startsWith(cleanSiren)) return "Le SIRET doit commencer par le SIREN.";
      if (!v.metier.trim()) return "Précise ton activité.";
      if (!v.ape_naf.trim()) return "Code APE / NAF requis.";
      return null;
    }
    if (s === 3) {
      if (!v.address_line1.trim()) return "Adresse requise.";
      if (!v.postal_code.trim()) return "Code postal requis.";
      if (!v.city.trim()) return "Ville requise.";
      return null;
    }
    if (s === 4) {
      const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
      const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();
      if (cleanIban.length < 15) return "IBAN requis (15 caractères minimum).";
      if (cleanBic.length < 8) return "BIC requis (8 caractères minimum).";
      return null;
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => (s < 4 ? ((s + 1) as StepId) : s));
  }
  function back() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as StepId) : s));
  }

  async function finish() {
    const err = validateStep(4);
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      const cleanSiren = v.siren.replace(/\s/g, "");
      const cleanSiret = v.siret.replace(/\s/g, "");
      const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
      const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");
      const { error } = await supabase
        .from("profiles")
        .update({
          ...v,
          siren: cleanSiren,
          siret: cleanSiret,
          iban: cleanIban,
          bic: cleanBic,
          onboarded: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stepper segmenté */}
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const done = s.id < step;
          const active = s.id === step;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex flex-col items-center gap-1.5">
              <div
                className={
                  "h-9 w-9 grid place-items-center rounded-full transition-all " +
                  (done
                    ? "bg-brand-500 text-white"
                    : active
                      ? "bg-brand-500 text-white shadow-pop"
                      : "bg-surface-2 text-ink-400")
                }
              >
                {done ? <Check size={16} /> : <Icon size={16} />}
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

      <Card className="space-y-5 animate-fade-in">
        {step === 1 ? <StepIdentity v={v} setV={setV} /> : null}
        {step === 2 ? (
          <StepCompany
            v={v}
            setV={setV}
            sirenStatus={sirenStatus}
            onSiretChange={onSiretChange}
          />
        ) : null}
        {step === 3 ? <StepAddress v={v} setV={setV} /> : null}
        {step === 4 ? <StepBank v={v} setV={setV} /> : null}

        {error ? (
          <p className="text-small text-danger-600 bg-danger-500/10 rounded-2xl px-4 py-2.5">
            {error}
          </p>
        ) : null}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        {step > 1 ? (
          <Button variant="secondary" type="button" onClick={back} disabled={saving}>
            <ArrowLeft size={14} /> Précédent
          </Button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <Button type="button" onClick={next}>
            Suivant <ArrowRight size={14} />
          </Button>
        ) : (
          <Button type="button" onClick={finish} disabled={saving}>
            {saving ? "Enregistrement…" : "Terminer"}
            {!saving ? <Check size={14} /> : null}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Étape 1 : Identité ──────────────────────────────────────────────
function StepIdentity({ v, setV }: { v: Values; setV: (v: Values) => void }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          <User size={18} />
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">Qui es-tu ?</h2>
          <p className="text-small text-ink-500 mt-0.5">
            Pré-rempli depuis Google. Tu peux ajuster.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="display_name">Nom & prénom</Label>
        <Input
          id="display_name"
          required
          value={v.display_name}
          onChange={(e) => setV({ ...v, display_name: e.target.value })}
          placeholder="Adrien Rabillat"
        />
      </div>
    </>
  );
}

// ─── Étape 2 : Entreprise ────────────────────────────────────────────
function StepCompany({
  v,
  setV,
  sirenStatus,
  onSiretChange,
}: {
  v: Values;
  setV: (v: Values) => void;
  sirenStatus: "idle" | "loading" | "found" | "not_found";
  onSiretChange: (raw: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          <Building2 size={18} />
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">Ton entreprise</h2>
          <p className="text-small text-ink-500 mt-0.5">
            Tape ton SIRET — on remplit le reste automatiquement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="siret" hint="14 chiffres">SIRET</Label>
          <div className="relative">
            <Input
              id="siret"
              required
              inputMode="numeric"
              value={v.siret}
              onChange={(e) => onSiretChange(e.target.value)}
              className="pr-10"
              placeholder="50160189200026"
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
            <p className="mt-1.5 text-xs text-warn-600">SIREN introuvable — saisis tes infos à la main ci-dessous.</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="siren" hint="9 premiers chiffres du SIRET">SIREN</Label>
          <Input
            id="siren"
            required
            inputMode="numeric"
            value={v.siren}
            onChange={(e) => setV({ ...v, siren: e.target.value.replace(/\D/g, "").slice(0, 9) })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="legal_form">Forme juridique</Label>
        <select
          id="legal_form"
          value={v.legal_form}
          onChange={(e) => setV({ ...v, legal_form: e.target.value as LegalForm })}
          className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
        >
          <option value="EI">EI (Entrepreneur Individuel)</option>
          <option value="EURL">EURL</option>
          <option value="SARL">SARL</option>
          <option value="SAS">SAS</option>
          <option value="SASU">SASU</option>
          <option value="SA">SA</option>
          <option value="SCI">SCI</option>
          <option value="Autre">Autre</option>
        </select>
      </div>

      <div>
        <Label htmlFor="business_name" hint="optionnel">Nom commercial</Label>
        <Input
          id="business_name"
          value={v.business_name}
          onChange={(e) => setV({ ...v, business_name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="metier">Activité</Label>
        <Input
          id="metier"
          required
          value={v.metier}
          onChange={(e) => setV({ ...v, metier: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="ape_naf" hint="ex: 6201Z">Code APE / NAF</Label>
        <Input
          id="ape_naf"
          required
          value={v.ape_naf}
          onChange={(e) => setV({ ...v, ape_naf: e.target.value })}
        />
      </div>
    </>
  );
}

// ─── Étape 3 : Adresse ───────────────────────────────────────────────
function StepAddress({ v, setV }: { v: Values; setV: (v: Values) => void }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          <MapPin size={18} />
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">Ton adresse pro</h2>
          <p className="text-small text-ink-500 mt-0.5">
            Apparaît sur tes factures. Tape pour rechercher.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="address_line1">Adresse</Label>
        <AddressAutocomplete
          id="address_line1"
          required
          value={v.address_line1}
          onChange={(val) => setV({ ...v, address_line1: val })}
          onSelect={(s) => setV({ ...v, address_line1: s.addressLine1, postal_code: s.postalCode, city: s.city })}
          placeholder="Rechercher une adresse…"
        />
      </div>

      <div>
        <Label htmlFor="address_line2" hint="optionnel">Complément</Label>
        <Input
          id="address_line2"
          value={v.address_line2}
          onChange={(e) => setV({ ...v, address_line2: e.target.value })}
          placeholder="Bât A, Étage 3…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            required
            value={v.postal_code}
            onChange={(e) => setV({ ...v, postal_code: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            required
            value={v.city}
            onChange={(e) => setV({ ...v, city: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

// ─── Étape 4 : Bancaire ──────────────────────────────────────────────
function StepBank({ v, setV }: { v: Values; setV: (v: Values) => void }) {
  const bank = identifyBank(v.iban, v.bic);
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          <Landmark size={18} />
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">Tes coordonnées bancaires</h2>
          <p className="text-small text-ink-500 mt-0.5">
            Pour que tes clients te paient. Apparaissent sur le PDF.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="iban">IBAN</Label>
        <Input
          id="iban"
          required
          value={v.iban}
          onChange={(e) => setV({ ...v, iban: e.target.value })}
          placeholder="FR76 2823 2300 0014 4312 1519 4229"
        />
        {bank ? (
          <p className="mt-1.5 text-xs text-ink-500 flex items-center gap-2">
            <span className="inline-grid place-items-center h-5 w-5 rounded-md bg-brand-500/10 text-brand-600 text-[9px] font-semibold">
              {bank.glyph ?? "B"}
            </span>
            Compte identifié : <span className="font-medium text-ink-700">{bank.name}</span>
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="bic">BIC</Label>
        <Input
          id="bic"
          required
          value={v.bic}
          onChange={(e) => setV({ ...v, bic: e.target.value })}
          placeholder="REVOFRP2"
        />
      </div>
    </>
  );
}
