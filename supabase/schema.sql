-- ============================================================================
-- Auto-entrepreneur schema
-- Run this in Supabase SQL editor (Project > SQL > New query) once per project.
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.user. Holds everything printed on an invoice
-- (including fields required by the French "facturation électronique" reform
-- of September 2026-27 and the May 2022 "EI" mention for entrepreneurs
-- individuels) and the Gmail refresh token used to send emails on their
-- behalf.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  business_name text,                                -- optional trade name ("nom commercial")
  -- Asthia ne supporte que les Entrepreneurs Individuels (EI). La régime
  -- fiscal supporté est 'micro' (= micro-entrepreneur / auto-entrepreneur).
  -- Voir migration 2026-04-26b_lock_to_micro_entrepreneur.sql.
  legal_form text not null default 'EI' check (legal_form = 'EI'),
  tax_regime text not null default 'micro' check (tax_regime in ('micro')),
  metier text,                                       -- "Sophrologue", "Manutention", ...
  siren text,                                        -- 9 digits, printed next to "EI"
  siret text,                                        -- 14 digits = SIREN + 5 (NIC)
  ape_naf text,                                      -- optional: NAF/APE code
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'France',
  phone text,
  website text,
  iban text,
  bic text,
  -- Mentions obligatoires auto-entrepreneur (URSSAF)
  rcs_number text,                                   -- commerçant : numéro RCS (= siren la plupart du temps)
  rcs_city text,                                     -- ville du greffe RCS
  rm_number text,                                    -- artisan : numéro Répertoire des Métiers
  rm_department text,                                -- département d'immatriculation RM
  insurance_name text,                               -- nom de l'assureur responsabilité civile professionnelle
  insurance_coverage text,                           -- couverture géographique (ex: "France métropolitaine")
  -- Médiateur de la consommation (art. L616-1 Code de la consommation)
  -- Obligatoire si l'émetteur facture des particuliers (BtoC). Laisse vide sinon.
  mediator_name text,                                -- ex: "CM2C — Centre de la médiation de la consommation"
  mediator_website text,                             -- URL publique du médiateur
  gmail_refresh_token text,                          -- encrypted at rest by Supabase, never sent to browser
  gmail_connected_email text,
  -- Activité (vente / service BIC / libéral BNC / mixte). Pilote tous les
  -- calculs URSSAF (taux, abattement, seuil annuel).
  activity_kind text check (activity_kind in ('vente', 'service_bic', 'liberal_bnc', 'mixte')),
  urssaf_frequency text not null default 'monthly' check (urssaf_frequency in ('monthly', 'quarterly')),
  urssaf_declaration_day smallint default 3 check (urssaf_declaration_day between 1 and 28),
  -- Numérotation factures et devis. Le format supporte les tokens {year}
  -- et {seq:N}. Le seed mémorise le dernier numéro émis ; le prochain
  -- sera seed+1. Permet à un AE qui démarre en cours d'année avec déjà
  -- des factures émises de redémarrer à la bonne valeur.
  invoice_number_format text not null default 'F-{year}-{seq:4}',
  invoice_number_seed integer not null default 0 check (invoice_number_seed >= 0),
  quote_number_format text not null default 'D-{year}-{seq:4}',
  quote_number_seed integer not null default 0 check (quote_number_seed >= 0),
  -- Sprint 3 : séquence séparée pour les numéros de brouillons (BROUILLON-XXX)
  draft_number_seed integer not null default 0 check (draft_number_seed >= 0),
  -- Flag "j'ai déjà facturé cette année" coché à l'onboarding. Déclenche
  -- un modal bloquant au 1er dashboard pour saisir les derniers numéros
  -- et proposer l'import de compta.
  had_prior_activity boolean not null default false,
  prior_activity_resolved boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,                              -- human-readable, e.g. 2026-0001 or BROUILLON-001
  client_name text,
  client_email text not null,
  client_siren text,                                 -- B2B: client's SIREN (required from 2026 for pro clients)
  client_address text,                               -- optional, for B2B
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_cents integer,                          -- prix unitaire HT ; si null on retombe sur amount_cents
  amount_cents integer not null,                     -- positif pour les factures, négatif pour les avoirs
  currency text not null default 'EUR',
  -- "Nature de l'opération" — mandatory from Sept 2026
  operation_type text not null default 'service' check (operation_type in ('service','vente','mixte')),
  execution_date date,                               -- date de réalisation de la prestation / livraison
  delivery_address text,                             -- only filled when the delivery address differs from the billing address
  status text not null default 'draft' check (status in ('draft','sent','paid','cancelled')),
  issued_on date not null default current_date,
  due_on date,                                       -- optional: date d'échéance
  payment_terms text,                                -- "Paiement à réception", "30 jours fin de mois"...
  discount_terms text not null default 'Néant',     -- conditions d'escompte (URSSAF : obligatoire)
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_path text,                                     -- storage path inside the "invoices" bucket
  xml_path text,                                     -- Factur-X CII XML path (once generated)
  -- Sprint 3 : avoirs + numérotation brouillons
  invoice_type text not null default 'standard' check (invoice_type in ('standard', 'credit_note')),
  related_invoice_id uuid references public.invoices(id) on delete set null,
  draft_number text,                                 -- numéro temporaire brouillon, conservé comme trace
  -- Sprint 4 : factures importées depuis un autre logiciel (historique).
  -- Figées en lecture, exclues des déclarations URSSAF.
  imported boolean not null default false,
  imported_at timestamptz,
  import_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number),
  -- Les avoirs ont un amount_cents < 0, les factures > 0
  check ((invoice_type = 'credit_note' and amount_cents < 0) or (invoice_type = 'standard' and amount_cents > 0))
);

create index if not exists invoices_user_paid_idx
  on public.invoices(user_id, paid_at)
  where paid_at is not null;
create index if not exists invoices_user_status_idx
  on public.invoices(user_id, status);
create index if not exists invoices_related_idx
  on public.invoices(related_invoice_id)
  where related_invoice_id is not null;

-- ---------------------------------------------------------------------------
-- clients — carnet d'adresses par utilisateur (particulier ou pro)
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
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

create index if not exists clients_user_archived_idx on public.clients(user_id, archived);
create index if not exists clients_user_email_idx on public.clients(user_id, lower(email));

-- ---------------------------------------------------------------------------
-- prior_revenue — CA encaissé avant Asthia, ventilé par mois et catégorie.
-- Branché sur le cycle URSSAF via already_declared (Sprint 4).
-- ---------------------------------------------------------------------------
create table if not exists public.prior_revenue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_year integer not null check (period_year between 2020 and 2100),
  period_month integer not null check (period_month between 1 and 12),
  activity_kind text not null
    check (activity_kind in ('vente', 'service_bic', 'liberal_bnc')),
  amount_cents bigint not null check (amount_cents >= 0),
  -- Sprint 4 : branchement URSSAF
  already_declared boolean not null default false,
  submitted_at timestamptz,
  urssaf_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_year, period_month, activity_kind)
);
create index if not exists prior_revenue_user_year_idx on public.prior_revenue(user_id, period_year);
create index if not exists prior_revenue_pending_idx
  on public.prior_revenue(user_id, period_year, period_month)
  where already_declared = false and submitted_at is null;

-- ---------------------------------------------------------------------------
-- Monthly URSSAF declarations
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_year smallint not null,
  period_month smallint not null check (period_month between 1 and 12),
  total_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','submitted','confirmed','error','skipped')),
  urssaf_reference text,
  error_message text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_year, period_month)
);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_invoices_touch on public.invoices;
create trigger trg_invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_declarations_touch on public.monthly_declarations;
create trigger trg_declarations_touch before update on public.monthly_declarations
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_clients_touch on public.clients;
create trigger trg_clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ---------------------------------------------------------------------------
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
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.invoices              enable row level security;
alter table public.monthly_declarations  enable row level security;
alter table public.clients               enable row level security;

drop policy if exists "profiles: self"  on public.profiles;
create policy "profiles: self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "invoices: self" on public.invoices;
create policy "invoices: self" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "declarations: self" on public.monthly_declarations;
create policy "declarations: self" on public.monthly_declarations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clients: self" on public.clients;
create policy "clients: self" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for generated invoice PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- IMPORTANT : pour que le RE-envoi d'une facture fonctionne, il faut
-- quatre policies distinctes sur storage.objects (Supabase ne déduit pas
-- les opérations : chaque verbe doit être couvert). upload(..., upsert:true)
-- enchaîne INSERT puis UPDATE si l'objet existe déjà.

drop policy if exists "invoices bucket: self read"   on storage.objects;
create policy "invoices bucket: self read"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "invoices bucket: self write"  on storage.objects;
create policy "invoices bucket: self write"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "invoices bucket: self update" on storage.objects;
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

drop policy if exists "invoices bucket: self delete" on storage.objects;
create policy "invoices bucket: self delete"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
