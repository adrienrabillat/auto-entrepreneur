-- ===========================================================================
-- Sprint mai 2026 — Email tracking via Resend webhooks
--
-- Ajoute les colonnes nécessaires pour stocker les events Resend
-- (delivered / opened / bounced / complained / failed) sur :
--  - invoices : factures envoyées par email
--  - quotes   : devis envoyés par email
--  - messages : messages outbound depuis la messagerie in-app
--
-- L'event arrive via un webhook signé Svix (pattern identique à
-- /api/inbound/contact). Le handler match sur `resend_email_id`
-- (déjà stocké pour messages, ajouté ici pour invoices/quotes) et
-- update le champ correspondant.
--
-- delivery_status : statut "courant" calculé en agrégeant les events.
-- Permet d'afficher un badge UI en une lecture sans recalculer côté
-- code à chaque rendu. Ordre de priorité (le plus "haut" l'emporte) :
--   complained > bounced > opened > delivered > sent > pending
-- ===========================================================================

-- Type enum pour le statut de livraison email.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'delivery_status') then
    create type delivery_status as enum (
      'pending',     -- pas encore envoyé (brouillon)
      'sent',        -- envoyé à Resend (= envoi accepté par notre code)
      'delivered',   -- accepté par le SMTP du destinataire
      'opened',      -- mail ouvert au moins une fois (open tracking)
      'bounced',     -- rejet permanent (mauvaise adresse, boîte pleine, etc.)
      'complained',  -- destinataire a marqué comme spam (urgent à monitorer)
      'failed'       -- erreur définitive lors de l'envoi
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists resend_email_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists delivery_status delivery_status not null default 'pending',
  add column if not exists last_event_at timestamptz;

create index if not exists invoices_resend_email_id_idx
  on public.invoices (resend_email_id)
  where resend_email_id is not null;

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists resend_email_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists delivery_status delivery_status not null default 'pending',
  add column if not exists last_event_at timestamptz;

create index if not exists quotes_resend_email_id_idx
  on public.quotes (resend_email_id)
  where resend_email_id is not null;

-- ---------------------------------------------------------------------------
-- messages (in-app messaging)
-- ---------------------------------------------------------------------------
-- resend_email_id est déjà présent. On ajoute les autres colonnes.
alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists delivery_status delivery_status not null default 'pending',
  add column if not exists last_event_at timestamptz;

create index if not exists messages_resend_email_id_idx
  on public.messages (resend_email_id)
  where resend_email_id is not null;
