"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { lookupSiren } from "@/lib/sirene";
import { createClient } from "@/lib/supabase/browser";

type Values = {
  display_name: string;
  business_name: string;
  legal_form: "EI" | "EURL" | "SASU" | "Autre";
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

export function OnboardingForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SIRET / SIREN auto-fill : interroge l'API Recherche d'entreprises dès
  // qu'on a un SIREN à 9 chiffres. Le résultat ÉCRASE systématiquement les
  // champs entreprise (nom commercial, activité, APE, adresse, forme
  // juridique) — c'est la source officielle, on lui fait confiance.
  // L'utilisateur peut éditer ensuite, on ne re-fetch plus tant qu'il
  // ne change pas le SIREN (lastResolvedSirenRef).
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
      // Override : la valeur API gagne sur ce que l'user a tapé. On garde
      // la valeur précédente uniquement si l'API renvoie vide pour ce champ.
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cleanSiren = v.siren.replace(/\s/g, "");
    const cleanSiret = v.siret.replace(/\s/g, "");
    const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
    const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();
    if (!/^\d{9}$/.test(cleanSiren)) return fail("SIREN : 9 chiffres attendus.");
    if (!/^\d{14}$/.test(cleanSiret)) return fail("SIRET : 14 chiffres attendus.");
    if (!cleanSiret.startsWith(cleanSiren)) return fail("Le SIRET doit commencer par le SIREN.");
    if (!v.ape_naf.trim()) return fail("Code APE / NAF requis.");
    if (cleanIban.length < 15) return fail("IBAN requis (15 caractères minimum).");
    if (cleanBic.length < 8) return fail("BIC requis (8 caractères minimum).");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("Session expirée");
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
    if (error) return fail(error.message);
    router.replace("/dashboard");

    function fail(msg: string) {
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Card className="space-y-5">
        {/* SIRET / SIREN en TOUT premier — pré-remplit le reste du formulaire */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="siret" hint="14 chiffres — on remplit le reste automatiquement">SIRET</Label>
            <div className="relative">
              <Input
                id="siret"
                required
                inputMode="numeric"
                value={v.siret}
                onChange={(e) => onSiretChange(e.target.value)}
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

        {/* Identité — pré-remplie après le SIRET */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="display_name">Nom & prénom</Label>
            <Input
              id="display_name"
              required
              value={v.display_name}
              onChange={(e) => setV({ ...v, display_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="legal_form">Forme juridique</Label>
            <select
              id="legal_form"
              value={v.legal_form}
              onChange={(e) => setV({ ...v, legal_form: e.target.value as Values["legal_form"] })}
              className="h-10 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
            >
              <option value="EI">EI (Entrepreneur Individuel)</option>
              <option value="EURL">EURL</option>
              <option value="SASU">SASU</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
            <Input
              aria-label="Complément d'adresse"
              value={v.address_line2}
              onChange={(e) => setV({ ...v, address_line2: e.target.value })}
            />
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              required
              value={v.iban}
              onChange={(e) => setV({ ...v, iban: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bic">BIC</Label>
            <Input
              id="bic"
              required
              value={v.bic}
              onChange={(e) => setV({ ...v, bic: e.target.value })}
            />
          </div>
        </div>

        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Continuer"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
