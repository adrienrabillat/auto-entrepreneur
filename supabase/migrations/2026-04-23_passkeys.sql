-- Table pour stocker les passkeys WebAuthn (Face ID / Touch ID / Windows Hello)
-- Sert de verrou de 2ᵉ niveau au-dessus de la session Google : l'utilisateur
-- doit avoir une session Supabase active ET avoir prouvé son passkey sur cet
-- appareil depuis moins d'1 heure (sessionStorage côté client) pour accéder
-- à l'app.

create table if not exists public.user_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[],
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists user_passkeys_user_idx on public.user_passkeys(user_id);

alter table public.user_passkeys enable row level security;

drop policy if exists "passkeys: self select" on public.user_passkeys;
create policy "passkeys: self select" on public.user_passkeys
  for select using (auth.uid() = user_id);

drop policy if exists "passkeys: self delete" on public.user_passkeys;
create policy "passkeys: self delete" on public.user_passkeys
  for delete using (auth.uid() = user_id);

-- Pas de policy INSERT / UPDATE : ça passe exclusivement par le service role
-- côté serveur (createAdminClient), après vérification de la signature WebAuthn.
