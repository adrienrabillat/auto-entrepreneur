-- ============================================================================
-- Étape 4 onboarding "Activité & URSSAF" + numérotation factures/devis
--
-- Trois groupes de colonnes :
--
--   1. ACTIVITÉ : la catégorie d'activité (vente / service BIC / libéral BNC
--      / mixte) pilote tous les calculs URSSAF (taux de cotisation, abattement
--      fiscal, seuil annuel). Demandée à l'onboarding.
--
--   2. URSSAF : la fréquence (mensuelle ou trimestrielle) est choisie par
--      l'AE à son inscription URSSAF. Pilote la cadence du cron.
--      urssaf_declaration_day existait déjà.
--
--   3. NUMÉROTATION : format personnalisable (ex: "F-{year}-{seq:4}") +
--      séquence persistée. Permet à un AE qui démarre en cours d'année
--      avec déjà des factures de redémarrer au bon numéro. Idem pour les
--      devis (numérotation indépendante, pas de contrainte légale de
--      séquence pour les devis).
--
--   4. PRIOR ACTIVITY : flag "as-tu déjà facturé cette année ?" demandé à
--      l'onboarding. Si oui, on déclenche un modal au premier dashboard
--      pour collecter les derniers numéros + offrir l'import de compta.
-- ============================================================================

-- ─── 1. Activité ─────────────────────────────────────────────────────────
-- 'mixte' est autorisé pour les AE qui font à la fois vente et service.
-- Dans ce cas la ventilation par facture (operation_type sur invoices)
-- détermine quel taux URSSAF s'applique à chaque encaissement.
alter table public.profiles
  add column if not exists activity_kind text
  check (activity_kind in ('vente', 'service_bic', 'liberal_bnc', 'mixte'));

comment on column public.profiles.activity_kind is
  'Catégorie d''activité au sens URSSAF. Pilote taux de cotisation, abattement fiscal et seuil annuel. NULL tant que pas renseigné.';

-- ─── 2. Fréquence URSSAF ─────────────────────────────────────────────────
-- 'monthly' par défaut car ~95% des AE sont en mensuel à l'inscription.
alter table public.profiles
  add column if not exists urssaf_frequency text not null default 'monthly'
  check (urssaf_frequency in ('monthly', 'quarterly'));

comment on column public.profiles.urssaf_frequency is
  'Cadence des déclarations URSSAF, choisie à l''inscription. Modifiable une fois par an avant le 31 octobre.';

-- ─── 3. Numérotation factures ────────────────────────────────────────────
-- Format : peut contenir les tokens {year} (4 chiffres) et {seq:N} (N = padding).
-- Exemples valides : "F-{year}-{seq:4}" → "F-2026-0001"
--                    "{year}/{seq:3}"   → "2026/001"
--                    "{seq}"            → "1", "2", "3"...
-- On valide le format minimal au moment de l'INSERT côté app, pas au check.
alter table public.profiles
  add column if not exists invoice_number_format text not null default 'F-{year}-{seq:4}';

-- Dernier numéro émis (séquence brute, sans formatage). Le prochain sera
-- invoice_number_seed + 1. Default 0 = première facture sera 1.
alter table public.profiles
  add column if not exists invoice_number_seed integer not null default 0
  check (invoice_number_seed >= 0);

comment on column public.profiles.invoice_number_format is
  'Gabarit du numéro de facture. Tokens supportés : {year}, {seq:N}. Modifiable tant qu''aucune facture n''a été émise dans l''année courante.';

comment on column public.profiles.invoice_number_seed is
  'Dernière séquence émise. Le prochain numéro sera seed+1. Permet à un AE qui démarre en cours d''année de redémarrer au bon numéro (ex: seed=46 → prochaine facture = 47).';

-- ─── 4. Numérotation devis ───────────────────────────────────────────────
-- Indépendante des factures. Pas de contrainte légale de séquence sur les
-- devis (contrairement aux factures), mais on respecte la même logique pour
-- la cohérence visuelle.
alter table public.profiles
  add column if not exists quote_number_format text not null default 'D-{year}-{seq:4}';

alter table public.profiles
  add column if not exists quote_number_seed integer not null default 0
  check (quote_number_seed >= 0);

-- ─── 5. Prior activity flags ─────────────────────────────────────────────
-- had_prior_activity : l'user a coché "j'ai déjà facturé cette année" à
-- l'onboarding. Déclenche le modal first-dashboard.
-- prior_activity_resolved : passé à true une fois que l'user a saisi ses
-- derniers numéros dans le modal. Évite le re-prompt à chaque visite.
alter table public.profiles
  add column if not exists had_prior_activity boolean not null default false;

alter table public.profiles
  add column if not exists prior_activity_resolved boolean not null default false;

comment on column public.profiles.had_prior_activity is
  'Vrai si l''user a déclaré avoir déjà facturé cette année à l''onboarding. Déclenche le modal first-dashboard.';

comment on column public.profiles.prior_activity_resolved is
  'Vrai une fois que l''user a renseigné ses derniers numéros + traité l''offre d''import de compta. Évite la re-popup.';
