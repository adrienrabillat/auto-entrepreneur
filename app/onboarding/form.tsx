"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Loader2, Check, AlertCircle, ArrowLeft, ArrowRight, User, Building2, MapPin, Landmark, ShieldAlert } from "lucide-react";
import { lookupSiren } from "@/lib/sirene";
import { identifyBank } from "@/lib/iban-banks";
import { createClient } from "@/lib/supabase/browser";

// Asthia ne supporte qu'un seul cas d'usage : l'Entrepreneur Individuel au
// régime micro-entreprise. Cette constante est utilisée à la fois pour
// alimenter la BDD (legal_form = 'EI', tax_regime = 'micro') et pour bloquer
// les comptes qui ne correspondent pas (SARL, SAS, EURL…).
const SUPPORTED_LEGAL_FORM = "EI" as const;

type Values = {
  display_name: string;
  business_name: string;
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
  // Confirmation explicite du régime micro. Pas envoyé en BDD (tax_regime est
  // figé à 'micro' côté Postgres), uniquement utilisé pour le contrôle UI.
  is_micro: boolean;
};

type StepId = 1 | 2 | 3 | 4;

const STEPS: { id: StepId; label: string; icon: typeof User }[] = [
  { id: 1, label: "Identité",   icon: User },
  { id: 2, label: "Entreprise", icon: Building2 },
  { id: 3, label: "Adresse",    icon: MapPin },
  { id: 4, label: "Bancaire",   icon: Landmark },
];

// Clé localStorage pour mémoriser l'étape courante du wizard.
// Les valeurs des champs sont elles persistées côté Supabase via auto-save.
const STEP_LS_KEY = "ae-onboarding-step";

export function OnboardingForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  const [step, setStep] = useState<StepId>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const saved = window.localStorage.getItem(STEP_LS_KEY);
      const n = saved ? parseInt(saved, 10) : 1;
      return n >= 1 && n <= 4 ? (n as StepId) : 1;
    } catch {
      return 1;
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Persiste l'étape courante en localStorage. À l'ouverture suivante,
  // l'utilisateur retombe au même endroit.
  useEffect(() => {
    try { window.localStorage.setItem(STEP_LS_KEY, String(step)); } catch { /* storage off */ }
  }, [step]);

  // ─── Draft auto-save Supabase (débouncé) ────────────────────────────
  // À chaque modification des champs, on programme une sauvegarde à 800ms.
  // On met onboarded=false explicitement pour ne pas laisser un demi-profil
  // déclenchant la redirection /dashboard. Le passage à true se fait
  // uniquement dans finish().
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; return; }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveAbortRef.current?.abort();
      const ctrl = new AbortController();
      saveAbortRef.current = ctrl;
      setDraftStatus("saving");
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || ctrl.signal.aborted) return;
        const cleanSiren = v.siren.replace(/\s/g, "");
        const cleanSiret = v.siret.replace(/\s/g, "");
        const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
        const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();
        // is_micro est purement UI — Supabase n'a pas cette colonne, on la
        // retire avant l'UPDATE pour éviter un PGRST204 ("column not found").
        // tax_regime est figé à 'micro' côté Postgres (CHECK + default), on
        // ne l'envoie donc jamais depuis le client.
        const { is_micro: _ignored, ...persistable } = v;
        await supabase
          .from("profiles")
          .update({
            ...persistable,
            legal_form: SUPPORTED_LEGAL_FORM,
            siren: cleanSiren,
            siret: cleanSiret,
            iban: cleanIban,
            bic: cleanBic,
            onboarded: false,
          })
          .eq("id", user.id);
        if (ctrl.signal.aborted) return;
        setDraftStatus("saved");
        // Auto-revient à idle après 1.5s pour ne pas laisser
        // l'indicateur permanent.
        setTimeout(() => setDraftStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch {
        // On échoue silencieusement — le draft auto-save ne doit jamais
        // bloquer l'utilisateur. La validation finale dans finish() fait foi.
        setDraftStatus("idle");
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  // SIRET auto-fill — déclenché à l'étape 2
  // Statuts possibles :
  //  - idle / loading / not_found : flux normal de saisie
  //  - found      : entreprise trouvée ET c'est bien un EI → on continue
  //  - blocked    : entreprise trouvée MAIS pas un EI (SARL, SAS, EURL…) →
  //                 on bloque la suite de l'onboarding avec un message clair
  const [sirenStatus, setSirenStatus] = useState<"idle" | "loading" | "found" | "not_found" | "blocked">("idle");
  // Quand on bloque, on retient la forme juridique détectée (label brut + code
  // normalisé) pour l'afficher à l'utilisateur dans le message d'erreur.
  const [blockedLegalForm, setBlockedLegalForm] = useState<string | null>(null);
  const lastResolvedSirenRef = useRef<string>(defaultValues.siren?.replace(/\D/g, "") ?? "");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clean = v.siren.replace(/\D/g, "");
    if (clean.length !== 9) {
      if (sirenStatus !== "idle") setSirenStatus("idle");
      if (blockedLegalForm) setBlockedLegalForm(null);
      return;
    }
    if (clean === lastResolvedSirenRef.current) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSirenStatus("loading");
    setBlockedLegalForm(null);
    lookupSiren(clean, ctrl.signal).then((company) => {
      if (ctrl.signal.aborted) return;
      if (!company) {
        setSirenStatus("not_found");
        return;
      }
      // Garde-fou n°1 : on n'autorise que les Entrepreneurs Individuels.
      // SIRENE renvoie le code INSEE de la forme juridique (1000 = EI), qu'on
      // a normalisé dans lib/insee/legal-forms.ts → "EI" / "SARL" / "SAS"...
      if (company.legalFormNormalized !== SUPPORTED_LEGAL_FORM) {
        setBlockedLegalForm(company.legalForm ?? company.legalFormNormalized);
        setSirenStatus("blocked");
        // On ne pré-remplit RIEN pour ne pas laisser un demi-profil de SARL
        // dans la BDD via l'auto-save de brouillon.
        lastResolvedSirenRef.current = clean;
        return;
      }
      setV((prev) => ({
        ...prev,
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
  }, [v.siren, sirenStatus, blockedLegalForm]);

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
      // Garde-fous légal_form / régime micro : on bloque ici en plus du
      // bouton désactivé, pour le cas où l'user contourne via la touche
      // entrée ou un raccourci.
      if (sirenStatus === "blocked") {
        return "Cette forme juridique n'est pas supportée par Asthia.";
      }
      if (!v.is_micro) {
        return "Confirme que tu es bien en régime micro-entreprise pour continuer.";
      }
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
    // Avant la finalisation : on rejoue les validations des 4 étapes pour
    // refuser tout profil incomplet ou contournement (modif devtools, retour
    // arrière étrange…). validateStep(2) couvre le blocage SARL et la
    // confirmation régime micro.
    for (const stepId of [1, 2, 3, 4] as const) {
      const err = validateStep(stepId);
      if (err) {
        setStep(stepId);
        setError(err);
        return;
      }
    }
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
      // Cf. commentaire identique dans l'auto-save : on retire is_micro
      // (champ UI uniquement) et on force legal_form = 'EI'. La contrainte
      // CHECK côté Postgres rejette tout autre valeur — c'est notre filet
      // de sécurité serveur.
      const { is_micro: _ignored, ...persistable } = v;
      const { error } = await supabase
        .from("profiles")
        .update({
          ...persistable,
          legal_form: SUPPORTED_LEGAL_FORM,
          siren: cleanSiren,
          siret: cleanSiret,
          iban: cleanIban,
          bic: cleanBic,
          onboarded: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      // Onboarding terminé : on nettoie le step mémorisé pour qu'un éventuel
      // retour futur sur /onboarding (ex: clic depuis settings) reparte de
      // l'étape 1 plutôt que de la dernière étape consultée.
      try { window.localStorage.removeItem(STEP_LS_KEY); } catch { /* storage off */ }
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Indicateur de brouillon — s'affiche pendant et après l'auto-save */}
      <div className="h-5 flex items-center justify-end gap-1.5 -mb-2 text-xs text-ink-500">
        {draftStatus === "saving" ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            <span>Enregistrement du brouillon…</span>
          </>
        ) : draftStatus === "saved" ? (
          <>
            <Check size={11} className="text-success-600" />
            <span className="text-success-600">Brouillon enregistré</span>
          </>
        ) : null}
      </div>

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
            blockedLegalForm={blockedLegalForm}
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

      {/* Navigation
          Le bouton Suivant est désactivé tant que le SIRENE renvoie une
          forme juridique non supportée OU tant que l'user n'a pas confirmé
          le régime micro. Le code n'autorise donc PAS de passer à l'étape
          suivante si on est en blocage forme juridique. */}
      <div className="flex items-center justify-between gap-2">
        {step > 1 ? (
          <Button variant="secondary" type="button" onClick={back} disabled={saving}>
            <ArrowLeft size={14} /> Précédent
          </Button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <Button
            type="button"
            onClick={next}
            disabled={step === 2 && (sirenStatus === "blocked" || !v.is_micro)}
          >
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
// Cette étape est aussi la barrière d'entrée du produit : on n'accepte que
// les Entrepreneurs Individuels au régime micro. Tout SIRET qui correspond
// à une autre forme juridique (SARL, SAS, EURL…) déclenche l'écran de
// blocage et désactive le bouton "Suivant".
function StepCompany({
  v,
  setV,
  sirenStatus,
  blockedLegalForm,
  onSiretChange,
}: {
  v: Values;
  setV: (v: Values) => void;
  sirenStatus: "idle" | "loading" | "found" | "not_found" | "blocked";
  blockedLegalForm: string | null;
  onSiretChange: (raw: string) => void;
}) {
  // Quand on est en blocage forme juridique on cache le reste du formulaire :
  // pas la peine d'afficher 4 champs supplémentaires si l'user ne pourra
  // jamais cliquer sur "Suivant". Ça réduit le bruit visuel et focalise
  // l'attention sur le message + l'action (changer de SIRET).
  const isBlocked = sirenStatus === "blocked";

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
            ) : sirenStatus === "blocked" ? (
              <ShieldAlert size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-600" />
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

      {/* Écran de blocage : forme juridique non supportée.
          On affiche la forme détectée pour que l'user comprenne pourquoi son
          SIRET est rejeté. C'est volontairement ferme, sans CTA "contactez-
          nous" tant qu'on n'a pas une vraie roadmap pour les sociétés. */}
      {isBlocked ? (
        <div className="rounded-2xl bg-danger-500/5 border border-danger-500/20 p-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-danger-500/10 text-danger-600">
              <ShieldAlert size={18} />
            </div>
            <div className="space-y-1.5">
              <p className="text-body font-medium text-ink-900">
                Asthia ne prend pas en charge ce type de structure.
              </p>
              <p className="text-small text-ink-600">
                D&apos;après le SIRENE, ton entreprise est{" "}
                <span className="font-medium text-ink-900">{blockedLegalForm ?? "une société"}</span>.
                Asthia est conçu uniquement pour les{" "}
                <span className="font-medium text-ink-900">entrepreneurs individuels</span>{" "}
                au régime micro (auto-entrepreneurs). Les sociétés (SARL, SAS, EURL, SASU…)
                ont besoin d&apos;une vraie comptabilité que d&apos;autres outils gèrent mieux que nous.
              </p>
              <p className="text-xs text-ink-500 pt-1">
                Si tu penses que c&apos;est une erreur, vérifie ton SIRET ci-dessus.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Le reste du formulaire ne s'affiche que si le SIRET est compatible
          (ou pas encore résolu — l'user peut être en train de taper). */}
      {!isBlocked ? (
        <>
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

          {/* Confirmation explicite du régime micro.
              Le SIRENE nous dit qu'on est bien sur une EI mais ne nous dit
              PAS si la personne est au régime micro ou au régime réel — ce
              n'est pas un champ public. On demande donc à l'user de
              confirmer activement. Pas de stockage en BDD : tax_regime est
              figé à 'micro' côté Postgres, c'est juste un garde-fou UX
              pour qu'un EI au réel ne s'inscrive pas par erreur. */}
          <label
            htmlFor="is_micro"
            className="flex items-start gap-3 rounded-2xl bg-brand-500/5 border border-brand-500/15 p-4 cursor-pointer hover:bg-brand-500/10 transition-colors"
          >
            <input
              id="is_micro"
              type="checkbox"
              checked={v.is_micro}
              onChange={(e) => setV({ ...v, is_micro: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="space-y-0.5">
              <p className="text-small font-medium text-ink-900">
                Je suis bien en régime micro-entreprise (auto-entrepreneur).
              </p>
              <p className="text-xs text-ink-500">
                Asthia ne gère pas l&apos;EI au régime réel (TVA collectée, comptabilité
                en partie double, bilan annuel). Si c&apos;est ton cas, tu auras besoin
                d&apos;un autre outil.
              </p>
            </div>
          </label>
        </>
      ) : null}
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
