-- =====================================================================
-- Migration 2026-04-23 — URSSAF compliance + carnet clients
-- =====================================================================
-- À exécuter UNE FOIS dans Supabase → SQL editor → New query → Run.
-- Idempotente : peut être rejouée sans effet de bord.
--
-- 1. Étend public.profiles avec téléphone, site web, RCS/RM, assurance pro
--    (exigences mentions obligatoires auto-entrepreneur URSSAF).
-- 2. Étend public.invoices avec quantité, prix unitaire, date d'exécution,
--    conditions d'escompte (par défaut "Néant").
-- 3. Crée public.clients (carnet d'adresses) + RLS + trigger updated_at.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles — colonnes URSSAF additionnelles
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone              text,
  add column if not exists website            text,
  add column if not exists rcs_number         text,    -- "RCS Paris 123 456 789" → on stocke juste le numéro
  add column if not exists rcs_city           text,    -- ville d'immatriculation RCS (commerçants)
  add column if not exists rm_number          text,    -- "RM 123 456 789 / 75" → numéro seul
  add column if not exists rm_department      text,    -- département d'immat. RM (artisans)
  add column if not exists insurance_name     text,    -- nom de l'assureur RC Pro
  add column if not exists insurance_coverage text;    -- couverture géographique (ex. "France métropolitaine")

-- ---------------------------------------------------------------------
-- invoices — qty + PU + date d'exécution + escompte
-- ---------------------------------------------------------------------
-- On conserve amount_cents (= total HT = qty × unit_price_cents) pour
-- rester rétro-compatible avec les factures déjà créées.
alter table public.invoices
  add column if not exists quantity           numeric(10,2) not null default 1,
  add column if not exists unit_price_cents   integer,                 -- si null → calcul depuis amount_cents / quantity
  add column if not exists execution_date     date,                    -- date de l'opération / fin d'exécution
  add column if not exists discount_terms     text not null default 'Néant',
  add column if not exists payment_terms      text;                    -- "Paiement à réception", "30 jours fin de mois"…

-- Pour les factures existantes on initialise unit_price_cents = amount_cents
update public.invoices
  set unit_price_cents = amount_cents
  where unit_price_cents is null;

-- ---------------------------------------------------------------------
-- clients — carnet d'adresses (particulier ou professionnel)
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  -- Particulier
  first_name text,
  last_name text,
  -- Pro
  company_name text,
  siren text,                                 -- 9 chiffres pour un client français
  -- Contact
  email text not null,
  phone text,
  -- Adresse de facturation
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'France',
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_archived_idx
  on public.clients(user_id, archived);
create index if not exists clients_user_email_idx
  on public.clients(user_id, lower(email));

drop trigger if exists trg_clients_touch on public.clients;
create trigger trg_clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

alter table public.clients enable row level security;

drop policy if exists "clients: self" on public.clients;
create policy "clients: self" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- invoices ↔ clients — référence optionnelle (on garde aussi les champs
-- dénormalisés sur l'invoice pour que le PDF reflète l'instant T, même
-- si le client est renommé plus tard).
-- ---------------------------------------------------------------------
alter table public.invoices
  add column if not exists client_id uuid references public.clients(id) on delete set null;
