-- ===========================================================================
-- Sprint mai 2026 — Logo, alias Asthia, messagerie in-app
--
-- Trois ajouts indépendants regroupés dans une seule migration parce qu'ils
-- atterrissent sur la même release de prod :
--
-- 1. profiles.logo_path : path Storage du logo de l'AE, intégré sur les
--    PDF factures/devis. Bucket 'logos' privé avec RLS user-scopée.
-- 2. profiles.asthia_alias : alias unique style "prenom.nom" utilisé pour
--    construire l'adresse "<alias>@asthia.fr" (envoi des factures depuis
--    une identité par utilisateur au lieu du factures@asthia.fr partagé).
-- 3. messages / message_threads : messagerie in-app — quand un client
--    répond à un mail Asthia, on stocke le message en base et on l'affiche
--    dans une conversation liée à la facture/devis. L'AE peut répondre
--    depuis l'app, sa réponse est ré-émise via Resend.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles.logo_path
-- ---------------------------------------------------------------------------
-- Path dans le bucket 'logos' (format: {user_id}/logo.{ext}). NULL si
-- l'AE n'a pas uploadé de logo — dans ce cas le PDF ne montre pas de logo.
alter table public.profiles
  add column if not exists logo_path text;

-- Bucket privé pour stocker les logos (un par AE). Pas public : on sert
-- les images via une URL signée temporaire ou via une route /api qui
-- vérifie l'auth.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', false)
on conflict (id) do nothing;

-- Quatre policies sur storage.objects (Supabase exige une policy par verbe).
-- Path attendu : {user_id}/{filename}. La policy autorise l'AE à lire,
-- uploader, mettre à jour et supprimer SES propres fichiers uniquement.

drop policy if exists "logos bucket: self read" on storage.objects;
create policy "logos bucket: self read"
  on storage.objects for select
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "logos bucket: self write" on storage.objects;
create policy "logos bucket: self write"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "logos bucket: self update" on storage.objects;
create policy "logos bucket: self update"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "logos bucket: self delete" on storage.objects;
create policy "logos bucket: self delete"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2. profiles.asthia_alias
-- ---------------------------------------------------------------------------
-- Alias unique stocké en lowercase, contraint à [a-z0-9.-]. Généré au
-- moment de l'onboarding à partir de business_name (en priorité) ou
-- prenom.nom. Suffixe -2/-3/random en cas de collision. Une fois assigné,
-- on ne change plus (sinon les anciennes factures pointent vers une
-- adresse morte et la messagerie casse).
--
-- Format final attendu : "<alias>@asthia.fr"
alter table public.profiles
  add column if not exists asthia_alias text;

-- Unicité stricte côté DB. NULL OK (utilisateurs créés avant cette
-- migration n'ont pas encore d'alias) — on le générera lazily au premier
-- envoi de facture, ou via un script de backfill.
create unique index if not exists profiles_asthia_alias_uniq
  on public.profiles (asthia_alias)
  where asthia_alias is not null;

-- Validation light : pas de check strict sur le format pour ne pas se
-- retrouver bloqué par des cas tordus (caractères Unicode, slugification
-- limite). La logique de génération côté app garantit le format.

-- ---------------------------------------------------------------------------
-- 3. Messagerie in-app
-- ---------------------------------------------------------------------------
-- Modèle : un thread = une conversation entre un AE et un client, liée
-- (optionnellement) à une facture ou un devis. Plusieurs messages par
-- thread, dans les deux sens (inbound depuis le client, outbound depuis
-- l'AE via le composer in-app).
--
-- On stocke email_id Resend pour debug / retry et message_id RFC822 pour
-- préserver le threading correctement quand le client répond depuis son
-- client mail.

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Lien vers la facture ou le devis qui a démarré le thread. Au moins
  -- un des deux doit être renseigné (sauf cas d'un mail entrant spontané
  -- qu'on n'arrive pas à matcher — auquel cas null/null est OK).
  invoice_id uuid references public.invoices(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  -- Email du client (côté distant) — utilisé comme "to" quand l'AE répond.
  client_email text not null,
  client_name text,
  subject text not null,
  -- Stats matérialisées pour l'UI list (évite COUNT() à chaque fetch).
  last_message_at timestamptz not null default now(),
  unread_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_threads_user_idx
  on public.message_threads (user_id, last_message_at desc);

create index if not exists message_threads_invoice_idx
  on public.message_threads (invoice_id) where invoice_id is not null;

create index if not exists message_threads_quote_idx
  on public.message_threads (quote_id) where quote_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'inbound' = du client vers l'AE ; 'outbound' = de l'AE vers le client.
  direction text not null check (direction in ('inbound', 'outbound')),
  from_email text not null,
  from_name text,
  to_email text not null,
  subject text not null,
  -- Corps en HTML (priorité) ET texte (fallback). Au moins un des deux.
  html text,
  text text,
  -- IDs externes pour debug et threading RFC822.
  resend_email_id text,                              -- id retourné par Resend (envoi sortant ou inbound)
  message_id text,                                   -- header Message-ID RFC822
  in_reply_to text,                                  -- header In-Reply-To
  -- Timestamps : on garde le received_at distinct du created_at car le
  -- mail peut arriver tard chez nous (latence webhook).
  received_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (thread_id, received_at);

create index if not exists messages_user_unread_idx
  on public.messages (user_id, read_at)
  where read_at is null and direction = 'inbound';

-- RLS : un AE ne voit que ses propres threads et messages.
alter table public.message_threads enable row level security;
alter table public.messages         enable row level security;

drop policy if exists "message_threads: self" on public.message_threads;
create policy "message_threads: self" on public.message_threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages: self" on public.messages;
create policy "messages: self" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
