-- ============================================================================
--  ASTHIA — RESET + RECREATE FROM SCRATCH
--
--  ⚠️  CE SCRIPT DROP TOUTES LES TABLES PUBLIQUES ET LES RECRÉE.
--  ⚠️  TOUTES LES DONNÉES DE L'APP SONT PERDUES (factures, devis, clients,
--      déclarations, profils, données importées). Les comptes auth.users
--      sont préservés — un profil vide est recréé pour chacun, ils
--      retomberont sur l'onboarding à la prochaine connexion.
--
--  À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
--  Si tu veux aussi supprimer les comptes utilisateurs (et tester
--  vraiment depuis 0 comme un nouveau user), va dans Supabase
--  Authentication → Users → sélectionne et delete manuellement, OU
--  décommente la section "WIPE AUTH USERS" tout en bas.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 1 — DROP                                                       ║
-- ║                                                                       ║
-- ║  On drop dans l'ordre inverse des dépendances (ou avec CASCADE pour   ║
-- ║  ne pas se prendre la tête avec les FKs). On drop aussi triggers,     ║
-- ║  fonctions, et policies storage.                                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Triggers sur auth.users (notre handle_new_user) : à drop avant la fonction
drop trigger if exists on_auth_user_created on auth.users;

-- Tables app — CASCADE pour emporter les FK qui pointent dessus.
-- L'ordre n'a plus d'importance grâce à CASCADE, mais on liste pour
-- que ce soit lisible : du plus dépendant au moins dépendant.
drop table if exists public.quotes               cascade;
drop table if exists public.prior_revenue        cascade;
drop table if exists public.monthly_declarations cascade;
drop table if exists public.invoices             cascade;
drop table if exists public.clients              cascade;
drop table if exists public.profiles             cascade;

-- Fonctions partagées
drop function if exists public.touch_updated_at()  cascade;
drop function if exists public.handle_new_user()   cascade;

-- Policies storage (on les recréera plus bas).
drop policy if exists "invoices bucket: self read"   on storage.objects;
drop policy if exists "invoices bucket: self write"  on storage.objects;
drop policy if exists "invoices bucket: self update" on storage.objects;
drop policy if exists "invoices bucket: self delete" on storage.objects;

-- Le bucket lui-même est CONSERVÉ (pour ne pas perdre la config), mais
-- ses fichiers sont orphelins après le drop des invoices. On peut les
-- nettoyer manuellement depuis Supabase → Storage → invoices si besoin.


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 2 — RECREATE                                                   ║
-- ║                                                                       ║
-- ║  Schéma complet, à jour, avec toutes les colonnes des migrations      ║
-- ║  ultérieures déjà intégrées. À partir de maintenant, schema.sql       ║
-- ║  initial est OBSOLÈTE — c'est CE FICHIER qui fait foi.                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";


-- ─── profiles ───────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  business_name text,
  -- Verrouillé : Asthia ne supporte que les Entrepreneurs Individuels (EI)
  -- au régime fiscal de la micro-entreprise.
  legal_form text not null default 'EI' check (legal_form = 'EI'),
  tax_regime text not null default 'micro' check (tax_regime in ('micro')),
  metier text,
  siren text,
  siret text,
  ape_naf text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'France',
  phone text,
  website text,
  iban text,
  bic text,
  -- Mentions légales auto-entrepreneur
  rcs_number text,
  rcs_city text,
  rm_number text,
  rm_department text,
  insurance_name text,
  insurance_coverage text,
  mediator_name text,
  mediator_website text,
  -- Gmail
  gmail_refresh_token text,
  gmail_connected_email text,
  -- Activité & URSSAF (pilote tous les calculs cotisations/seuils).
  -- activity_kind est NULLABLE volontairement : tant que l'user n'a pas
  -- choisi à l'étape 4 onboarding, on laisse NULL en BDD plutôt que ""
  -- (la CHECK rejetterait "").
  activity_kind text check (activity_kind in ('vente', 'service_bic', 'liberal_bnc', 'mixte')),
  urssaf_frequency text not null default 'monthly' check (urssaf_frequency in ('monthly', 'quarterly')),
  urssaf_declaration_day smallint default 3 check (urssaf_declaration_day between 1 and 28),
  -- Numérotation factures et devis
  invoice_number_format text not null default 'F-{year}-{seq:4}',
  invoice_number_seed integer not null default 0 check (invoice_number_seed >= 0),
  quote_number_format text not null default 'D-{year}-{seq:4}',
  quote_number_seed integer not null default 0 check (quote_number_seed >= 0),
  -- Flow first-dashboard
  had_prior_activity boolean not null default false,
  prior_activity_resolved boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ─── clients ────────────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  first_name text,
  last_name text,
  company_name text,
  siren text,
  email text not null,
  phone text,
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

create index clients_user_archived_idx on public.clients(user_id, archived);
create index clients_user_email_idx    on public.clients(user_id, lower(email));


-- ─── invoices ───────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,
  client_name text,
  client_email text not null,
  client_siren text,
  client_address text,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_cents integer,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  operation_type text not null default 'service' check (operation_type in ('service','vente','mixte')),
  execution_date date,
  delivery_address text,
  status text not null default 'draft' check (status in ('draft','sent','paid','cancelled')),
  issued_on date not null default current_date,
  due_on date,
  payment_terms text,
  discount_terms text not null default 'Néant',
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_path text,
  xml_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create index invoices_user_paid_idx
  on public.invoices(user_id, paid_at)
  where paid_at is not null;
create index invoices_user_status_idx
  on public.invoices(user_id, status);


-- ─── quotes (devis) ─────────────────────────────────────────────────────
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,
  client_name text,
  client_email text not null,
  client_siren text,
  client_address text,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_cents integer,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  operation_type text not null default 'service' check (operation_type in ('service','vente','mixte')),
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','expired')),
  issued_on date not null default current_date,
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create index quotes_user_status_idx on public.quotes (user_id, status);
create index quotes_user_issued_idx on public.quotes (user_id, issued_on desc);
create index quotes_client_idx      on public.quotes (client_id);
create index quotes_converted_idx
  on public.quotes (converted_invoice_id)
  where converted_invoice_id is not null;


-- ─── monthly_declarations (URSSAF) ──────────────────────────────────────
create table public.monthly_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_year smallint not null,
  period_month smallint not null check (period_month between 1 and 12),
  total_cents integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','submitted','confirmed','error','skipped')),
  urssaf_reference text,
  error_message text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_year, period_month)
);


-- ─── prior_revenue (CA importé à l'onboarding) ──────────────────────────
create table public.prior_revenue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_year integer not null check (period_year between 2020 and 2100),
  period_month integer not null check (period_month between 1 and 12),
  activity_kind text not null
    check (activity_kind in ('vente', 'service_bic', 'liberal_bnc')),
  amount_cents bigint not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_year, period_month, activity_kind)
);

create index prior_revenue_user_year_idx
  on public.prior_revenue (user_id, period_year);


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 3 — TRIGGERS, FONCTIONS, RLS                                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Updated_at générique
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger trg_profiles_touch       before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_invoices_touch       before update on public.invoices
  for each row execute function public.touch_updated_at();
create trigger trg_quotes_touch         before update on public.quotes
  for each row execute function public.touch_updated_at();
create trigger trg_declarations_touch   before update on public.monthly_declarations
  for each row execute function public.touch_updated_at();
create trigger trg_clients_touch        before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger trg_prior_revenue_touch  before update on public.prior_revenue
  for each row execute function public.touch_updated_at();

-- Auto-création de profil au signup. Récupère le nom Google si présent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── Row-level security ─────────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.invoices              enable row level security;
alter table public.quotes                enable row level security;
alter table public.clients               enable row level security;
alter table public.monthly_declarations  enable row level security;
alter table public.prior_revenue         enable row level security;

create policy "profiles: self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "invoices: self" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quotes: self" on public.quotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "clients: self" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "declarations: self" on public.monthly_declarations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prior_revenue: self" on public.prior_revenue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 4 — STORAGE BUCKET POLICIES                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Le bucket "invoices" est créé idempotemment (no-op s'il existe déjà).
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "invoices bucket: self read"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices bucket: self write"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices bucket: self update"
  on storage.objects for update
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices bucket: self delete"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 5 — BACKFILL DES PROFILS POUR LES USERS EXISTANTS             ║
-- ║                                                                       ║
-- ║  Le trigger handle_new_user ne se déclenche QU'AU signup. Les comptes ║
-- ║  déjà créés dans auth.users avant ce reset ont besoin qu'on leur      ║
-- ║  recrée un profil manuellement, sinon ils ne pourront pas se          ║
-- ║  connecter (l'app charge profile.* à toutes les pages).               ║
-- ║                                                                       ║
-- ║  Le INSERT ... SELECT iterates sur auth.users et crée un profil vide  ║
-- ║  pour chacun, avec son nom Google si dispo dans raw_user_meta_data.   ║
-- ║  Ils retomberont automatiquement sur /onboarding (onboarded=false par ║
-- ║  défaut) à leur prochaine connexion.                                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )
from auth.users u
on conflict (id) do nothing;


-- ============================================================================
--  ✅ DONE.
--
--  Vérifie dans Supabase → Table Editor que tu vois bien :
--    profiles, clients, invoices, quotes, monthly_declarations, prior_revenue
--  Et dans Authentication → Policies, les RLS "self" sur chaque table.
--
--  Tes comptes auth.users existants ont un profil vide. Reconnecte-toi, tu
--  retomberas sur l'onboarding propre.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────
-- (OPTIONNEL) WIPE AUTH USERS — décommente seulement si tu veux aussi
-- supprimer tous les comptes utilisateurs et forcer un re-signup complet
-- comme un nouvel utilisateur. ATTENTION : irréversible.
-- ────────────────────────────────────────────────────────────────────────
-- delete from auth.users;
