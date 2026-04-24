"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { identifyBank } from "@/lib/iban-banks";
import { createClient } from "@/lib/supabase/browser";
import { Check, Loader2 } from "lucide-react";
import {
  User,
  MapPin,
  Landmark,
  FileBadge,
  ShieldCheck,
  Scale,
  CalendarClock,
} from "lucide-react";

/**
 * En-tête de section du formulaire Profil — icône ronde colorée + titre + sous-titre.
 * Harmonise le look avec les cartes Gmail et Apparence de la page settings.
 */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-h3 text-ink-900">{title}</h2>
        {description ? <p className="text-small text-ink-500 mt-0.5">{description}</p> : null}
      </div>
    </div>
  );
}

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
  mediator_name: string;
  mediator_website: string;
  urssaf_declaration_day: number;
};

export function SettingsForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Auto-save : après 700 ms sans frappe on envoie un update Supabase.
  // Un useRef saute le premier render pour ne pas re-persister les valeurs
  // qu'on vient de charger depuis la DB.
  const initializedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(null);
    timerRef.current = setTimeout(() => { void save(); }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  async function save() {
    // Si un save est encore en vol, on l'abandonne silencieusement.
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    setState("saving");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");
      if (ctrl.signal.aborted) return;

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

      if (ctrl.signal.aborted) return;
      if (error) {
        setError(error.message);
        setState("error");
        return;
      }
      setState("saved");
      router.refresh();
      // Revient à "idle" après 2 s pour ne pas laisser un 'Enregistré ✓' permanent.
      setTimeout(() => {
        setState((s) => (s === "saved" ? "idle" : s));
      }, 2000);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Indicateur auto-save sticky, en haut à droite du bloc */}
      <div className="sticky top-2 z-10 flex justify-end -mb-3 pointer-events-none">
        {state === "saving" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface shadow-hair px-3 py-1 text-xs text-ink-500 pointer-events-auto">
            <Loader2 size={12} className="animate-spin" /> Enregistrement…
          </span>
        ) : state === "saved" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-3 py-1 text-xs text-success-600 pointer-events-auto">
            <Check size={12} /> Enregistré
          </span>
        ) : state === "error" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-500/10 px-3 py-1 text-xs text-danger-600 pointer-events-auto">
            Erreur : {error}
          </span>
        ) : null}
      </div>
      <Card className="space-y-5">
        <SectionHeader
          icon={<User size={18} />}
          title="Identité"
          description="Ce qui apparaît en haut de tes factures."
        />
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
        <SectionHeader
          icon={<MapPin size={18} />}
          title="Coordonnées"
          description="Adresse postale, téléphone et site web."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address_line1">Adresse</Label>
            <AddressAutocomplete
              id="address_line1"
              required
              value={v.address_line1}
              onChange={(val) => setV({ ...v, address_line1: val })}
              onSelect={(s) => setV({ ...v, address_line1: s.addressLine1, postal_code: s.postalCode, city: s.city })}
              placeholder="12 Rue Léonard De Vinci…"
            />
          </div>
          <div className="md:col-span-2">
            <Input aria-label="Complément" value={v.address_line2} onChange={(e) => setV({ ...v, address_line2: e.target.value })} />
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
            <Input id="phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="website" hint="optionnel">Site web</Label>
            <Input id="website" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          icon={<Landmark size={18} />}
          title="Coordonnées bancaires"
          description={"Obligatoires pour émettre une facture — apparaissent dans le bloc « Règlement » du PDF."}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" required value={v.iban} onChange={(e) => setV({ ...v, iban: e.target.value })} />
            {(() => {
              const bank = identifyBank(v.iban, v.bic);
              return bank ? (
                <p className="mt-1.5 text-xs text-ink-500 flex items-center gap-2">
                  <span className="inline-grid place-items-center h-5 w-5 rounded-md bg-brand-500/10 text-brand-600 text-[9px] font-semibold">
                    {bank.glyph ?? "B"}
                  </span>
                  Compte identifié : <span className="font-medium text-ink-700">{bank.name}</span>
                </p>
              ) : null;
            })()}
          </div>
          <div>
            <Label htmlFor="bic">BIC</Label>
            <Input id="bic" required value={v.bic} onChange={(e) => setV({ ...v, bic: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          icon={<FileBadge size={18} />}
          title="Registres pros (RCS / RM)"
          description="Obligatoire pour les commerçants (RCS) et les artisans (RM). Laisse vide si ton activité est libérale pure."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rcs_number" hint="commerçants — souvent = SIREN">Numéro RCS</Label>
            <Input id="rcs_number" value={v.rcs_number} onChange={(e) => setV({ ...v, rcs_number: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="rcs_city" hint="ville du greffe">Ville RCS</Label>
            <Input id="rcs_city" value={v.rcs_city} onChange={(e) => setV({ ...v, rcs_city: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="rm_number" hint="artisans">Numéro RM</Label>
            <Input id="rm_number" value={v.rm_number} onChange={(e) => setV({ ...v, rm_number: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="rm_department" hint="département">Département RM</Label>
            <Input id="rm_department" value={v.rm_department} onChange={(e) => setV({ ...v, rm_department: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          icon={<ShieldCheck size={18} />}
          title="Assurance professionnelle"
          description="Mention obligatoire quand ton activité y est soumise (bâtiment, conseil, santé, etc.)."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="insurance_name" hint="optionnel">Assureur</Label>
            <Input id="insurance_name" value={v.insurance_name} onChange={(e) => setV({ ...v, insurance_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="insurance_coverage" hint="couverture géographique">Couverture</Label>
            <Input id="insurance_coverage" value={v.insurance_coverage} onChange={(e) => setV({ ...v, insurance_coverage: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          icon={<Scale size={18} />}
          title="Médiation de la consommation"
          description="Obligatoire si tu factures des particuliers (art. L616-1 Code de la conso). Laisse vide tant que tu n'as pas adhéré à un médiateur — aucune mention n'apparaîtra sur les factures."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mediator_name" hint="ex: CM2C, AME Conso, Medicys…">Nom du médiateur</Label>
            <Input
              id="mediator_name"
              value={v.mediator_name}
              onChange={(e) => setV({ ...v, mediator_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="mediator_website" hint="URL publique">Site du médiateur</Label>
            <Input
              id="mediator_website"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={v.mediator_website}
              onChange={(e) => setV({ ...v, mediator_website: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          icon={<CalendarClock size={18} />}
          title="URSSAF"
          description="Chaque mois, l'app déclare automatiquement ton CA encaissé du mois précédent."
        />
        <div>
          <Label htmlFor="urssaf_declaration_day" hint="entre 1 et 28">Jour de la déclaration URSSAF</Label>
          <select
            id="urssaf_declaration_day"
            value={v.urssaf_declaration_day}
            onChange={(e) => setV({ ...v, urssaf_declaration_day: Number(e.target.value) })}
            className="h-12 w-full rounded-xl bg-surface px-4 text-body text-ink-900 shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Le {d} du mois
              </option>
            ))}
          </select>
        </div>
      </Card>
    </div>
  );
}
