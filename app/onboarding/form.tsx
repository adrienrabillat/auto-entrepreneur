"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Loader2, Check, AlertCircle, ArrowLeft, ArrowRight, User, Building2, MapPin, Landmark, ShieldAlert, Briefcase, ShoppingBag, Wrench, GraduationCap, Layers } from "lucide-react";
import { lookupSiren } from "@/lib/sirene";
import { identifyBank, formatIbanForDisplay, formatBicForDisplay } from "@/lib/iban-banks";
import { createClient } from "@/lib/supabase/browser";

// Asthia ne supporte qu'un seul cas d'usage : l'Entrepreneur Individuel au
// régime micro-entreprise. Cette constante est utilisée à la fois pour
// alimenter la BDD (legal_form = 'EI', tax_regime = 'micro') et pour bloquer
// les comptes qui ne correspondent pas (SARL, SAS, EURL…).
const SUPPORTED_LEGAL_FORM = "EI" as const;

type ActivityKind = "vente" | "service_bic" | "liberal_bnc" | "mixte";
type UrssafFrequency = "monthly" | "quarterly";

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
  // Activité & URSSAF (étape 4)
  activity_kind: ActivityKind | "";
  urssaf_frequency: UrssafFrequency;
  urssaf_declaration_day: number;
  invoice_number_format: string;
  // L'user déclare s'il a déjà facturé cette année. Si oui, un modal au
  // 1er dashboard collectera les derniers numéros + proposera un import.
  had_prior_activity: boolean;
  // Bancaire (étape 5)
  iban: string;
  bic: string;
  // Confirmation explicite du régime micro. Pas envoyé en BDD (tax_regime est
  // figé à 'micro' côté Postgres), uniquement utilisé pour le contrôle UI.
  is_micro: boolean;
};

type StepId = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: StepId; label: string; icon: typeof User }[] = [
  { id: 1, label: "Identité",   icon: User },
  { id: 2, label: "Entreprise", icon: Building2 },
  { id: 3, label: "Adresse",    icon: MapPin },
  { id: 4, label: "Activité",   icon: Briefcase },
  { id: 5, label: "Bancaire",   icon: Landmark },
];

// Clé localStorage pour mémoriser l'étape courante du wizard.
// Les valeurs des champs sont elles persistées côté Supabase via auto-save.
const STEP_LS_KEY = "ae-onboarding-step";

/**
 * Détermine la première étape incomplète à partir des defaultValues chargés
 * depuis Supabase. Sert à plafonner le step restauré du localStorage : on ne
 * peut pas se retrouver sur l'étape 4 si l'étape 1 n'a pas été remplie.
 *
 * Cette fonction est volontairement TOLÉRANTE — elle ne fait que vérifier
 * que les champs principaux ont une valeur. Les validations strictes (regex
 * SIREN, longueur IBAN…) restent dans validateStep() côté composant.
 */
function firstIncompleteStep(d: Values): StepId {
  if (!d.display_name?.trim()) return 1;
  // Étape 2 : SIREN/SIRET au moins esquissés. La confirmation `is_micro`
  // est aussi requise mais on ne la teste pas ici car elle est par défaut
  // décochée pour un nouveau user — on veut quand même qu'il aille à
  // l'étape 2 pour la cocher, pas qu'il soit bloqué à l'étape 1.
  if (!/^\d{14}$/.test(d.siret.replace(/\s/g, ""))) return 2;
  if (!d.metier?.trim() || !d.ape_naf?.trim()) return 2;
  if (!d.is_micro) return 2;
  if (!d.address_line1?.trim() || !d.postal_code?.trim() || !d.city?.trim()) return 3;
  // Étape 4 : on exige au minimum la catégorie d'activité (le reste a un
  // default sain). Si vide, on ramène l'user ici.
  if (!d.activity_kind) return 4;
  if (!d.invoice_number_format?.trim()) return 4;
  if (d.iban.replace(/\s/g, "").length < 15) return 5;
  if (d.bic.replace(/\s/g, "").length < 8) return 5;
  return 5;
}

export function OnboardingForm({ defaultValues }: { defaultValues: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues);
  // Initialisation de l'étape : on lit le localStorage MAIS on plafonne la
  // valeur à la première étape qui n'a pas encore de données valides côté
  // defaultValues. Sans ça, un user qui revient avec un step=4 mémorisé
  // mais des champs vides (cas typique : défaillance trigger SQL,
  // déconnexion en cours d'onboarding…) atterrissait sur l'étape Bancaire,
  // cliquait Terminer, et la validation finale le renvoyait silencieusement
  // à l'étape 1 — d'où la sensation de "boucle infinie" rapportée.
  const [step, setStep] = useState<StepId>(() => {
    if (typeof window === "undefined") return 1;
    let saved: StepId = 1;
    try {
      const raw = window.localStorage.getItem(STEP_LS_KEY);
      const n = raw ? parseInt(raw, 10) : 1;
      // BORNE 1-5 (et pas 1-4 !) — l'onboarding a 5 étapes depuis l'ajout
      // de "Activité & URSSAF". Bug historique : la borne avait été oubliée
      // lors du passage à 5 étapes, ce qui faisait retomber les comptes
      // arrivés à l'étape 5 silencieusement à l'étape 1 au reload (l'user
      // avait l'impression d'une "boucle infinie" sur l'onboarding).
      if (n >= 1 && n <= 5) saved = n as StepId;
    } catch { /* storage off, reste à 1 */ }
    // On plafonne à la première étape incomplète. Un step "mémorisé" plus
    // grand est ramené ici, ce qui force l'user à revoir ce qu'il manque.
    const firstIncomplete = firstIncompleteStep(defaultValues);
    return Math.min(saved, firstIncomplete) as StepId;
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
  //
  // ATTENTION race condition : finish() doit IMPÉRATIVEMENT annuler tout
  // auto-save en attente ou en cours, sinon un timer planifié juste avant
  // le clic "Terminer" peut écraser onboarded=true en onboarded=false 800ms
  // plus tard. C'est ce qui causait le bug "je clique Terminer et je
  // reviens à l'étape 1" — l'utilisateur retombait sur /onboarding car
  // onboarded était repassé à false par le timer en retard.
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  // Quand true, on bloque toute nouvelle planification d'auto-save. Mis à
  // true au tout début de finish() et jamais remis à false (le composant
  // sera démonté par le router.replace).
  const finishingRef = useRef(false);
  // Promesse de la sauvegarde actuellement en vol (s'il y en a une). On
  // l'utilise dans finish() pour ATTENDRE qu'elle se termine avant de
  // commit onboarded=true. Sans ça, le supabase-js ignore les AbortSignals
  // et un save en cours peut atterrir à Postgres APRÈS notre commit final.
  const inFlightSaveRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; return; }
    // Si finish() est en cours, on n'écrit plus rien depuis l'auto-save.
    if (finishingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Double-check au moment du fire : finish() a pu être appelé pendant
      // les 800ms de debounce.
      if (finishingRef.current) return;
      saveAbortRef.current?.abort();
      const ctrl = new AbortController();
      saveAbortRef.current = ctrl;
      setDraftStatus("saving");
      // On encapsule l'IIFE async dans une promesse exposée via inFlightSaveRef
      // pour que finish() puisse l'await avant son propre commit.
      const promise: Promise<void> = (async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || ctrl.signal.aborted || finishingRef.current) return;
          const cleanSiren = v.siren.replace(/\s/g, "");
          const cleanSiret = v.siret.replace(/\s/g, "");
          const cleanIban = v.iban.replace(/\s/g, "").toUpperCase();
          const cleanBic = v.bic.replace(/\s/g, "").toUpperCase();
          // is_micro est purement UI — Supabase n'a pas cette colonne, on la
          // retire avant l'UPDATE pour éviter un PGRST204 ("column not found").
          // tax_regime est figé à 'micro' côté Postgres (CHECK + default), on
          // ne l'envoie donc jamais depuis le client.
          const { is_micro: _ignored, ...persistable } = v;
          // Dernière barrière avant l'écriture : si finish() a été déclenché
          // pendant le getUser() ci-dessus, on n'écrit pas. Cette vérif
          // évite le scénario "auto-save écrase onboarded=true" même si
          // l'abort signal est ignoré par supabase-js.
          if (finishingRef.current) return;
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
      })();
      inFlightSaveRef.current = promise;
      // On nettoie la ref une fois la promesse résolue, MAIS uniquement si
      // c'est toujours nous qui sommes référencés (un save plus récent peut
      // nous avoir remplacés entretemps). Découplé du try/finally pour
      // éviter une référence circulaire à `promise` que TS refuse.
      void promise.finally(() => {
        if (inFlightSaveRef.current === promise) {
          inFlightSaveRef.current = null;
        }
      });
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
      // Activité & URSSAF
      if (!v.activity_kind) return "Choisis ta catégorie d'activité.";
      if (!["monthly", "quarterly"].includes(v.urssaf_frequency)) return "Précise la fréquence URSSAF.";
      if (v.urssaf_declaration_day < 1 || v.urssaf_declaration_day > 28) return "Jour de déclaration : entre 1 et 28.";
      if (!v.invoice_number_format.trim()) return "Format de numéro de facture requis.";
      // Le format doit contenir au minimum {seq} ou {seq:N} pour pouvoir
      // incrémenter. On ne valide pas plus précisément ici (les autres
      // tokens sont optionnels).
      if (!/\{seq(?::\d+)?\}/.test(v.invoice_number_format)) {
        return "Le format doit contenir {seq} (numéro qui s'incrémente).";
      }
      return null;
    }
    if (s === 5) {
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
    setStep((s) => (s < 5 ? ((s + 1) as StepId) : s));
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
    for (const stepId of [1, 2, 3, 4, 5] as const) {
      const err = validateStep(stepId);
      if (err) {
        setStep(stepId);
        setError(err);
        return;
      }
    }
    // ─── Anti-race avec l'auto-save ────────────────────────────────────
    // 1. On verrouille pour empêcher la planification de nouveaux saves.
    // 2. On annule le timer en attente (si l'user a tapé un caractère il y
    //    a moins de 800ms, un save est programmé mais pas encore parti).
    // 3. On abort un éventuel save déjà en vol et on attend qu'il se
    //    termine — supabase-js ignore l'AbortSignal donc le PATCH HTTP
    //    part de toute façon ; on attend pour être sûr de commit
    //    onboarded=true APRÈS et pas avant.
    finishingRef.current = true;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveAbortRef.current?.abort();
    saveAbortRef.current = null;
    if (inFlightSaveRef.current) {
      try { await inFlightSaveRef.current; } catch { /* ignore */ }
      inFlightSaveRef.current = null;
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

      {/* Stepper segmenté — 5 étapes */}
      <div className="grid grid-cols-5 gap-2">
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
        {step === 4 ? <StepActivity v={v} setV={setV} /> : null}
        {step === 5 ? <StepBank v={v} setV={setV} /> : null}

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
        {step < 5 ? (
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

// ─── Étape 4 : Activité & URSSAF ─────────────────────────────────────
// Pilote tous les calculs URSSAF (taux, abattement, seuil annuel) et la
// numérotation des factures. C'est l'étape la plus dense — on la structure
// en 4 sous-blocs visuels pour rester lisible.
function StepActivity({ v, setV }: { v: Values; setV: (v: Values) => void }) {
  // Catalogue figé des catégories d'activité au sens URSSAF. Les chiffres
  // (taux, abattement, seuil) sont indicatifs au moment du choix — ils
  // n'apparaîtront pas en BDD, ils servent juste à aider l'user à se
  // reconnaître. Les vrais calculs se font ailleurs (lib/declaration-service).
  const ACTIVITIES: {
    id: ActivityKind;
    label: string;
    desc: string;
    icon: typeof User;
  }[] = [
    {
      id: "vente",
      label: "Vente de marchandises",
      desc: "Achat-revente, e-commerce, restauration à emporter… Seuil 188 700 €/an, cotisations 12,3 %.",
      icon: ShoppingBag,
    },
    {
      id: "service_bic",
      label: "Prestations de services BIC",
      desc: "Artisanat, commerce de services, location meublée… Seuil 77 700 €/an, cotisations 21,2 %.",
      icon: Wrench,
    },
    {
      id: "liberal_bnc",
      label: "Profession libérale (BNC)",
      desc: "Conseil, formation, freelance, métiers du soin non réglementés… Seuil 77 700 €, cotisations 23,1 % (ou 23,2 % CIPAV).",
      icon: GraduationCap,
    },
    {
      id: "mixte",
      label: "Activité mixte",
      desc: "Tu fais à la fois de la vente ET du service. La ventilation se fera facture par facture.",
      icon: Layers,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          <Briefcase size={18} />
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">Ton activité & ta déclaration URSSAF</h2>
          <p className="text-small text-ink-500 mt-0.5">
            Ces choix pilotent le calcul de tes cotisations et la numérotation de tes factures.
          </p>
        </div>
      </div>

      {/* ─── Catégorie d'activité ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="activity_kind">Catégorie d&apos;activité</Label>
        <div className="grid grid-cols-1 gap-2">
          {ACTIVITIES.map((a) => {
            const selected = v.activity_kind === a.id;
            const Icon = a.icon;
            return (
              <label
                key={a.id}
                className={
                  "flex items-start gap-3 rounded-2xl p-3.5 cursor-pointer transition-colors border " +
                  (selected
                    ? "bg-brand-500/10 border-brand-500/40"
                    : "bg-surface border-ink-100 hover:bg-surface-2")
                }
              >
                <input
                  type="radio"
                  name="activity_kind"
                  value={a.id}
                  checked={selected}
                  onChange={() => setV({ ...v, activity_kind: a.id })}
                  className="sr-only"
                />
                <div
                  className={
                    "h-9 w-9 shrink-0 grid place-items-center rounded-xl " +
                    (selected ? "bg-brand-500 text-white" : "bg-surface-2 text-ink-500")
                  }
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-small font-medium text-ink-900">{a.label}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{a.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ─── Fréquence URSSAF + jour ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="urssaf_frequency">Fréquence de déclaration URSSAF</Label>
          <select
            id="urssaf_frequency"
            value={v.urssaf_frequency}
            onChange={(e) => setV({ ...v, urssaf_frequency: e.target.value as UrssafFrequency })}
            className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
          >
            <option value="monthly">Mensuelle</option>
            <option value="quarterly">Trimestrielle</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-500">
            Choisi à ton inscription URSSAF. Modifiable une fois par an avant le 31 octobre.
          </p>
        </div>
        <div>
          <Label htmlFor="urssaf_declaration_day" hint="entre 1 et 28">Jour de la déclaration</Label>
          <select
            id="urssaf_declaration_day"
            value={v.urssaf_declaration_day}
            onChange={(e) => setV({ ...v, urssaf_declaration_day: Number(e.target.value) })}
            className="h-12 w-full rounded-xl bg-surface px-3 text-body shadow-hair focus:outline-none focus:shadow-glow transition-shadow appearance-none"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Le {d} du mois
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Format des numéros de facture ────────────────────────── */}
      <InvoiceFormatPicker
        value={v.invoice_number_format}
        onChange={(fmt) => setV({ ...v, invoice_number_format: fmt })}
      />

      {/* ─── A déjà facturé cette année ? ─────────────────────────── */}
      <label
        htmlFor="had_prior_activity"
        className="flex items-start gap-3 rounded-2xl bg-surface-2 border border-ink-100 p-4 cursor-pointer hover:bg-surface-3 transition-colors"
      >
        <input
          id="had_prior_activity"
          type="checkbox"
          checked={v.had_prior_activity}
          onChange={(e) => setV({ ...v, had_prior_activity: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        <div className="space-y-0.5">
          <p className="text-small font-medium text-ink-900">
            J&apos;ai déjà émis des factures cette année (avant d&apos;utiliser Asthia).
          </p>
          <p className="text-xs text-ink-500">
            On te demandera tes derniers numéros de facture et de devis dès ta première
            visite, et on te proposera d&apos;importer ta compta passée.
          </p>
        </div>
      </label>
    </>
  );
}

/**
 * Sélecteur de format de numéro de facture, version "user-friendly".
 *
 * Plutôt que d'exposer la syntaxe technique avec ses tokens {year} / {seq:N},
 * on propose 4 presets visuels avec aperçu live :
 *   - F-2026-0001  (préfixe + année + séquence 4 chiffres)
 *   - 2026-0001    (année + séquence)
 *   - 2026-001     (année + séquence courte)
 *   - 0001         (juste un compteur)
 *
 * Un mode "Personnalisé" déplie un input avec la syntaxe brute pour les
 * power users qui veulent un format spécifique (ex: leur préfixe métier).
 */
function InvoiceFormatPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (fmt: string) => void;
}) {
  const PRESETS: { id: string; format: string; label: string }[] = [
    { id: "F-year-4",   format: "F-{year}-{seq:4}", label: "Préfixe + année + séquence" },
    { id: "year-4",     format: "{year}-{seq:4}",   label: "Année + séquence (4 chiffres)" },
    { id: "year-3",     format: "{year}-{seq:3}",   label: "Année + séquence (3 chiffres)" },
    { id: "seq-4",      format: "{seq:4}",          label: "Compteur simple" },
  ];
  const matchingPreset = PRESETS.find((p) => p.format === value);
  const [showAdvanced, setShowAdvanced] = useState(!matchingPreset);

  return (
    <div className="space-y-3">
      <Label htmlFor="invoice_format_preset">
        Format de tes numéros de facture
      </Label>

      {/* Grille des presets — chaque option affiche le RENDU concret en
          gros, son label en petit. C'est ce que l'user verra réellement. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const selected = !showAdvanced && p.format === value;
          return (
            <label
              key={p.id}
              className={
                "flex items-center justify-between gap-3 rounded-2xl p-3.5 cursor-pointer transition-colors border " +
                (selected
                  ? "bg-brand-500/10 border-brand-500/40"
                  : "bg-surface border-ink-100 hover:bg-surface-2")
              }
            >
              <input
                type="radio"
                name="invoice_format_preset"
                checked={selected}
                onChange={() => {
                  setShowAdvanced(false);
                  onChange(p.format);
                }}
                className="sr-only"
              />
              <div className="min-w-0">
                <div className="font-mono text-body text-ink-900 tabular-nums">
                  {renderNumberPreview(p.format, 1)}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">{p.label}</div>
              </div>
              {selected ? (
                <Check size={16} className="text-brand-600 shrink-0" />
              ) : null}
            </label>
          );
        })}
      </div>

      {/* Toggle vers le mode avancé. On l'ouvre par défaut si le format
          actuel ne match aucun preset (cas d'un user qui a déjà customisé). */}
      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="text-xs text-ink-500 hover:text-ink-900 transition-colors underline-offset-4 hover:underline"
      >
        {showAdvanced ? "← Revenir aux formats prédéfinis" : "Personnaliser le format →"}
      </button>

      {/* Mode avancé : input libre + tokens dispos en aide. */}
      {showAdvanced ? (
        <div className="rounded-2xl bg-surface-2 border border-ink-100 p-4 space-y-2">
          <div className="text-xs text-ink-500">
            Tokens disponibles :{" "}
            <code className="text-ink-900 bg-surface px-1.5 py-0.5 rounded">{"{year}"}</code>{" "}
            (année en cours) et{" "}
            <code className="text-ink-900 bg-surface px-1.5 py-0.5 rounded">{"{seq:4}"}</code>{" "}
            (séquence avec N zéros de padding). Le{" "}
            <code className="text-ink-900 bg-surface px-1.5 py-0.5 rounded">{"{seq}"}</code>{" "}
            est obligatoire.
          </div>
          <Input
            id="invoice_number_format_custom"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="text-xs text-ink-500">
            Aperçu de ta première facture :{" "}
            <span className="font-mono text-ink-900 tabular-nums">
              {renderNumberPreview(value, 1) || "—"}
            </span>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-ink-500">
        Tu pourras saisir le numéro de ta dernière facture émise (si tu en as déjà) à
        la première ouverture de l&apos;app.
      </p>
    </div>
  );
}

/**
 * Remplace les tokens d'un format de numéro par des valeurs concrètes pour
 * affichage. Utilisé dans l'onboarding (preview) et dans nextInvoiceNumber()
 * (génération réelle). Tokens supportés :
 *   {year}      — année en cours sur 4 chiffres
 *   {seq}       — séquence brute, sans padding
 *   {seq:N}     — séquence avec padding zéros sur N caractères
 */
function renderNumberPreview(format: string, seq: number): string {
  if (!format) return "";
  const year = String(new Date().getFullYear());
  return format
    .replace(/\{year\}/g, year)
    .replace(/\{seq:(\d+)\}/g, (_, n) => String(seq).padStart(parseInt(n, 10), "0"))
    .replace(/\{seq\}/g, String(seq));
}

// ─── Étape 5 : Bancaire ──────────────────────────────────────────────
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
        {/* On reformate à chaque frappe en groupes de 4 (convention ISO 13616).
            Saisie tolérante : que tu colles avec ou sans espaces, le résultat
            est uniformisé. La valeur stockée en BDD sera nettoyée à la fin
            via cleanIban dans finish() (espaces retirés, majuscules). */}
        <Input
          id="iban"
          required
          inputMode="text"
          autoComplete="off"
          value={v.iban}
          onChange={(e) => setV({ ...v, iban: formatIbanForDisplay(e.target.value) })}
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
          inputMode="text"
          autoComplete="off"
          value={v.bic}
          onChange={(e) => setV({ ...v, bic: formatBicForDisplay(e.target.value) })}
        />
      </div>
    </>
  );
}
