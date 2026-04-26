-- ============================================================================
--  ASTHIA — Migration consolidée à exécuter UNE SEULE FOIS dans Supabase.
--
--  Couvre tout ce qui a été ajouté au modèle de données depuis la version
--  initiale de schema.sql :
--    1. Verrouillage app sur EI (Entrepreneur Individuel) au régime micro
--    2. Colonnes activité, fréquence URSSAF et numérotation factures/devis
--    3. Table prior_revenue (CA déjà encaissé importé à l'onboarding)
--    4. Table quotes (devis) avec RLS, indexes et trigger updated_at
--
--  Le fichier est IDEMPOTENT : chaque ALTER/CREATE est protégé par
--  IF NOT EXISTS / IF EXISTS — tu peux ré-exécuter sans casser ce qui
--  est déjà en place.
--
--  Ouvre Supabase → SQL Editor → New query → colle tout ce fichier →
--  Run. Si tout est vert, c'est bon.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  1. VERROUILLAGE EI / MICRO-ENTREPRENEUR                            ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- L'app n'accepte plus que les Entrepreneurs Individuels au régime micro.
-- Toutes les autres formes juridiques (SARL, SAS, EURL, SASU, SCI…) sont
-- rejetées au niveau de la base : un client modifié en devtools ne pourra
-- rien insérer.

-- Backfill défensif : si des comptes legacy ont une autre forme juridique
-- (cas : version précédente acceptait 8 valeurs), on les ramène à 'EI'
-- avant d'appliquer la contrainte plus stricte. Pour ton usage interne
-- actuel (3 users) c'est OK ; pour la prod publique, le filtre amont
-- onboarding empêchera l'inscription en amont.
update public.profiles
   set legal_form = 'EI'
 where legal_form is distinct from 'EI';

alter table public.profiles
  drop constraint if exists profiles_legal_form_check;

alter table public.profiles
  add constraint profiles_legal_form_check
  check (legal_form = 'EI');

-- Régime fiscal : 'micro' uniquement supporté pour l'instant. Si plus
-- tard on ouvre le régime réel, il suffira d'élargir le CHECK.
alter table public.profiles
  add column if not exists tax_regime text not null default 'micro'
  check (tax_regime in ('micro'));

comment on column public.profiles.tax_regime is
  'Régime fiscal de l''entrepreneur. Seul ''micro'' est supporté pour l''instant.';


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  2. ACTIVITÉ, URSSAF ET NUMÉROTATION                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Catégorie d'activité au sens URSSAF.
-- Pilote tous les calculs : taux de cotisation, abattement fiscal, seuil
-- annuel. NULL tant que l'user n'a pas répondu à l'étape 4 onboarding.
alter table public.profiles
  add column if not exists activity_kind text
  check (activity_kind in ('vente', 'service_bic', 'liberal_bnc', 'mixte'));

comment on column public.profiles.activity_kind is
  'Catégorie d''activité au sens URSSAF (vente | service_bic | liberal_bnc | mixte).';

-- Fréquence des déclarations URSSAF. 'monthly' par défaut car ~95% des
-- AE sont en mensuel à l'inscription. Modifiable une fois par an avant
-- le 31 octobre côté URSSAF.
alter table public.profiles
  add column if not exists urssaf_frequency text not null default 'monthly'
  check (urssaf_frequency in ('monthly', 'quarterly'));

comment on column public.profiles.urssaf_frequency is
  'Cadence des déclarations URSSAF : mensuelle ou trimestrielle.';

-- Format du numéro de facture (tokens : {year}, {seq}, {seq:N}).
-- Le seed mémorise le DERNIER numéro émis ; le prochain sera seed+1.
-- Permet à un AE qui démarre en cours d'année avec déjà des factures
-- de redémarrer à la bonne séquence (ex: seed=46 → prochaine = F-2026-0047).
alter table public.profiles
  add column if not exists invoice_number_format text not null default 'F-{year}-{seq:4}';

alter table public.profiles
  add column if not exists invoice_number_seed integer not null default 0
  check (invoice_number_seed >= 0);

-- Devis : numérotation indépendante des factures.
alter table public.profiles
  add column if not exists quote_number_format text not null default 'D-{year}-{seq:4}';

alter table public.profiles
  add column if not exists quote_number_seed integer not null default 0
  check (quote_number_seed >= 0);

-- Flags "j'ai déjà facturé cette année" (coché à l'onboarding) et
-- "j'ai saisi mes derniers numéros + traité l'offre d'import"
-- (mis à true depuis le modal first-dashboard).
alter table public.profiles
  add column if not exists had_prior_activity boolean not null default false;

alter table public.profiles
  add column if not exists prior_activity_resolved boolean not null default false;


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  3. TABLE prior_revenue — CA importé à l'onboarding                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Quand un AE démarre en cours d'année, on lui demande de saisir le CA
-- qu'il a déjà encaissé (via l'assistant /import). Une ligne par
-- (utilisateur, période, catégorie d'activité). On reste sur period_month
-- 1-12 même en trimestriel : pour un trimestre on stocke le mois de
-- début (1 = T1, 4 = T2, 7 = T3, 10 = T4) — simplifie les requêtes.

create table if not exists public.prior_revenue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Année concernée (typiquement l'année courante au moment de l'import).
  -- Permet de garder l'historique des imports si l'user revient l'an suivant.
  period_year integer not null check (period_year between 2020 and 2100),
  -- Mois de début de la période. Pour mensuel : 1-12. Pour trimestriel :
  -- 1, 4, 7, 10 (mois de début de chaque trimestre).
  period_month integer not null check (period_month between 1 and 12),
  -- Catégorie de revenu déclaré. Trois valeurs concrètes — pas 'mixte' :
  -- pour un AE en activité mixte, on crée une ligne par catégorie sur la
  -- même période, ce qui permet de ventiler proprement.
  activity_kind text not null
    check (activity_kind in ('vente', 'service_bic', 'liberal_bnc')),
  -- Montant en centimes pour éviter les approximations float.
  amount_cents bigint not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une seule ligne par tuple (user, période, catégorie). L'upsert côté
  -- app utilisera cette contrainte pour les writes idempotents.
  unique (user_id, period_year, period_month, activity_kind)
);

create index if not exists prior_revenue_user_year_idx
  on public.prior_revenue (user_id, period_year);

-- Trigger updated_at (réutilise la fonction touch_updated_at déjà
-- définie dans schema.sql initial).
drop trigger if exists touch_prior_revenue_updated_at on public.prior_revenue;
create trigger touch_prior_revenue_updated_at
  before update on public.prior_revenue
  for each row execute function public.touch_updated_at();

-- RLS : chaque user ne voit/modifie que ses propres lignes.
alter table public.prior_revenue enable row level security;

drop policy if exists "prior_revenue: self" on public.prior_revenue;
create policy "prior_revenue: self"
  on public.prior_revenue
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.prior_revenue is
  'CA déjà encaissé avant utilisation d''Asthia, ventilé par mois (ou trimestre via mois de début) et par catégorie d''activité. Saisi via l''assistant /import à la première visite.';


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  4. TABLE quotes — DEVIS                                            ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Schéma volontairement très proche de invoices pour permettre la
-- conversion devis → facture en un INSERT. Différences principales :
--   - Statuts différents (accepted/rejected au lieu de paid)
--   - Pas de contrainte légale de séquence (numéros peuvent être supprimés
--     ou modifiés contrairement aux factures)
--   - Champ converted_invoice_id pour tracer la conversion en facture
--   - valid_until : date de validité du devis

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,                              -- "D-2026-0001"
  -- Client snapshot (denormalisation volontaire pour figer ce qui était
  -- envoyé au moment de l'émission, indépendamment des modifs ultérieures
  -- du client dans le carnet d'adresses).
  client_name text,
  client_email text not null,
  client_siren text,
  client_address text,
  -- Contenu du devis
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_cents integer,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  operation_type text not null default 'service'
    check (operation_type in ('service','vente','mixte')),
  -- Cycle de vie d'un devis :
  --   draft     → créé, pas encore envoyé
  --   sent      → envoyé au client par email
  --   accepted  → client a signé / accepté (manuel ou via signature future)
  --   rejected  → client a refusé
  --   expired   → date de validité dépassée sans réponse
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','expired')),
  issued_on date not null default current_date,
  -- Date de validité du devis. Par défaut +30 jours, modifiable à la
  -- création. Au-delà, l'app peut basculer automatiquement en 'expired'
  -- (job futur, pas obligatoire pour le MVP).
  valid_until date,
  -- Horodatages des transitions de statut. NULL tant que la transition
  -- n'a pas eu lieu. Permet de tracer l'historique sans table d'audit
  -- séparée pour le MVP.
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  -- Conversion en facture : pointe vers la facture créée à partir de ce
  -- devis. Permet d'éviter qu'un même devis soit converti deux fois (le
  -- bouton de conversion sera désactivé si converted_invoice_id IS NOT NULL).
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  -- Notes internes (pas envoyées au client).
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Contrainte d'unicité du numéro PAR utilisateur (deux users peuvent
  -- avoir leur propre "D-2026-0001"). Utilisée par l'INSERT atomique
  -- dans quote-service.ts pour gérer les double-clics.
  unique (user_id, number)
);

create index if not exists quotes_user_status_idx
  on public.quotes (user_id, status);

create index if not exists quotes_user_issued_idx
  on public.quotes (user_id, issued_on desc);

create index if not exists quotes_client_idx
  on public.quotes (client_id);

create index if not exists quotes_converted_idx
  on public.quotes (converted_invoice_id)
  where converted_invoice_id is not null;

-- Trigger updated_at
drop trigger if exists touch_quotes_updated_at on public.quotes;
create trigger touch_quotes_updated_at
  before update on public.quotes
  for each row execute function public.touch_updated_at();

-- RLS : chaque user ne voit/modifie que ses propres devis
alter table public.quotes enable row level security;

drop policy if exists "quotes: self" on public.quotes;
create policy "quotes: self"
  on public.quotes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.quotes is
  'Devis émis par l''utilisateur. Cycle de vie : draft → sent → accepted (→ converti en facture) ou rejected/expired.';


-- ============================================================================
--  FIN. Si tout est vert (pas d'erreur dans le panneau Supabase), tu peux
--  rafraîchir l'app — toutes les nouvelles features (étape 4 onboarding,
--  modal first-dashboard, page Settings enrichie, /import, /quotes) sont
--  désormais opérationnelles côté DB.
-- ============================================================================
