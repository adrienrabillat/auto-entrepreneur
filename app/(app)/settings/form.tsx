"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  phone: string;
  website: string;
  iban: string;
  bic: string;
  rcs_number: string;
  rcs_city: string;
  rm_number: string;
  rm_department: string;
  insurance_name: string;
  insurance_coverage: string;
  urssaf_declaration_day: number;
};

export function SettingsForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée");
      setState("error");
      return;
    }
    const day = Math.min(28, Math.max(1, Number(v.urssaf_declaration_day) || 3));
    const cleanSiren = v.siren.replace(/\s/g, "");
    const cleanSiret = v.siret.replace(/\s/g, "");
    const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
    const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();
    const { error } = await supabase
      .from("profiles")
      .update({
        ...v,
        siren: cleanSiren,
        siret: cleanSiret,
        iban: cleanIban,
        bic: cleanBic,
        urssaf_declaration_day: day,
      })
      .eq("id", user.id);
    if (error) {
      setError(error.message);
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">Identité</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="display_name">Nom & prénom</Label>
            <Input id="display_name" required value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="legal_form">Forme juridique</Label>
            <select
              id="legal_form"
              value={v.legal_form}
              onChange={(e) => setV({ ...v, legal_form: e.target.value as Values["legal_form"] })}
              className="h-10 w-full rounded-md bg-white px-3 text-body shadow-hair focus:outline-none focus:ring-2 focus:ring-ink-400/70"
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
          <Input id="business_name" value={v.business_name} onChange={(e) => setV({ ...v, business_name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="metier">Activité</Label>
          <Input id="metier" required value={v.metier} onChange={(e) => setV({ ...v, metier: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="siret" hint="14 chiffres">SIRET</Label>
            <Input
              id="siret"
              required
              inputMode="numeric"
              value={v.siret}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                setV({ ...v, siret: digits, siren: digits.length >= 9 ? digits.slice(0, 9) : v.siren });
              }}
            />
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
          <Label htmlFor="ape_naf" hint="optionnel">Code APE / NAF</Label>
          <Input id="ape_naf" value={v.ape_naf} onChange={(e) => setV({ ...v, ape_naf: e.target.value })} />
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">Coordonnées</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address_line1">Adresse</Label>
            <Input id="address_line1" required value={v.address_line1} onChange={(e) => setV({ ...v, address_line1: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Input aria-label="Complément" value={v.address_line2} onChange={(e) => setV({ ...v, address_line2: e.target.value })} placeholder="Complément (optionnel)" />
          </div>
          <div>
            <Label htmlFor="postal_code">Code postal</Label>
            <Input id="postal_code" required value={v.postal_code} onChange={(e) => setV({ ...v, postal_code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" required value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" hint="optionnel">Téléphone pro</Label>
            <Input id="phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="06 12 34 56 78" />
          </div>
          <div>
            <Label htmlFor="website" hint="optionnel">Site web</Label>
            <Input id="website" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} placeholder="https://monsite.fr" />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">Coordonnées bancaires</h2>
        <p className="text-small text-ink-500">
          Obligatoires pour émettre une facture. Elles apparaissent sur le PDF dans le bloc &laquo;&nbsp;Règlement&nbsp;&raquo;.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" required value={v.iban} onChange={(e) => setV({ ...v, iban: e.target.value })} placeholder="FR76 1234 5678 9012 3456 7890 123" />
          </div>
          <div>
            <Label htmlFor="bic">BIC</Label>
            <Input id="bic" required value={v.bic} onChange={(e) => setV({ ...v, bic: e.target.value })} placeholder="BNPAFRPP" />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">Registres pros (RCS / RM)</h2>
        <p className="text-small text-ink-500">
          Obligatoire pour les <strong>commerçants</strong> (RCS) et les <strong>artisans</strong> (RM). Laisse vide si ton activité est libérale pure.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rcs_number" hint="commerçants — souvent = SIREN">Numéro RCS</Label>
            <Input id="rcs_number" value={v.rcs_number} onChange={(e) => setV({ ...v, rcs_number: e.target.value })} placeholder="123 456 789" />
          </div>
          <div>
            <Label htmlFor="rcs_city" hint="ville du greffe">Ville RCS</Label>
            <Input id="rcs_city" value={v.rcs_city} onChange={(e) => setV({ ...v, rcs_city: e.target.value })} placeholder="Paris" />
          </div>
          <div>
            <Label htmlFor="rm_number" hint="artisans">Numéro RM</Label>
            <Input id="rm_number" value={v.rm_number} onChange={(e) => setV({ ...v, rm_number: e.target.value })} placeholder="123 456 789" />
          </div>
          <div>
            <Label htmlFor="rm_department" hint="département">Département RM</Label>
            <Input id="rm_department" value={v.rm_department} onChange={(e) => setV({ ...v, rm_department: e.target.value })} placeholder="75" />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">Assurance professionnelle</h2>
        <p className="text-small text-ink-500">
          Mention URSSAF obligatoire quand ton activité y est soumise (artisanat bâtiment, conseil, santé, etc.).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="insurance_name" hint="optionnel">Assureur</Label>
            <Input id="insurance_name" value={v.insurance_name} onChange={(e) => setV({ ...v, insurance_name: e.target.value })} placeholder="MAIF" />
          </div>
          <div>
            <Label htmlFor="insurance_coverage" hint="couverture géographique">Couverture</Label>
            <Input id="insurance_coverage" value={v.insurance_coverage} onChange={(e) => setV({ ...v, insurance_coverage: e.target.value })} placeholder="France métropolitaine" />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-h3 text-ink-900">URSSAF</h2>
        <div>
          <Label htmlFor="urssaf_declaration_day" hint="entre 1 et 28">Jour de la déclaration URSSAF</Label>
          <Input
            id="urssaf_declaration_day"
            type="number"
            min={1}
            max={28}
            value={v.urssaf_declaration_day}
            onChange={(e) => setV({ ...v, urssaf_declaration_day: Number(e.target.value) })}
          />
          <p className="mt-1 text-xs text-ink-500">
            Ce jour-là chaque mois, l&apos;app déclare automatiquement le CA encaissé du mois précédent.
          </p>
        </div>

        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          {state === "saved" ? <span className="text-small text-success-600">Enregistré ✓</span> : null}
          <Button type="submit" disabled={state === "saving"}>
            {state === "saving" ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
