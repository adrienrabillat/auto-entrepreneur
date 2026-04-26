-- ============================================================================
-- Verrouillage de l'app sur le seul cas d'usage supporté :
--   Entrepreneur Individuel (EI) au régime fiscal de la micro-entreprise.
--
-- Toutes les autres formes juridiques (EURL, SARL, SAS, SASU, SA, SCI, Autre)
-- sont rejetées au niveau de la base. L'UI de l'onboarding bloque déjà les
-- comptes non-EI via SIRENE, cette contrainte sert de filet de sécurité
-- côté serveur — un client modifié en devtools ne pourra rien insérer.
--
-- Note : "auto-entrepreneur" / "micro-entrepreneur" ne sont PAS des formes
-- juridiques au sens INSEE. Ce sont des régimes fiscaux et sociaux appliqués
-- à une EI. La forme juridique reste donc 'EI' ; le régime micro est tracé
-- via la nouvelle colonne tax_regime.
-- ============================================================================

-- ─── 1. Backfill défensif ────────────────────────────────────────────────
-- Si des comptes existants ont une forme juridique non supportée, on les
-- ramène à 'EI' avant d'appliquer la contrainte (sinon l'ALTER TABLE échoue).
-- En production réelle on préférerait migrer ces users hors de l'app, mais
-- pour l'instant on ne casse rien.
update public.profiles
   set legal_form = 'EI'
 where legal_form is distinct from 'EI';

-- ─── 2. Resserrement de la contrainte CHECK ──────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_legal_form_check;

alter table public.profiles
  add constraint profiles_legal_form_check
  check (legal_form = 'EI');

-- Le default 'EI' est déjà en place dans le schéma initial — rien à changer.

-- ─── 3. Nouvelle colonne tax_regime ──────────────────────────────────────
-- 'micro' = régime micro-entreprise (le seul qu'on supporte aujourd'hui).
-- Si plus tard on ouvre l'EI au réel, il suffira d'élargir le CHECK et de
-- brancher la logique TVA/compta correspondante.
alter table public.profiles
  add column if not exists tax_regime text not null default 'micro'
  check (tax_regime in ('micro'));

comment on column public.profiles.tax_regime is
  'Régime fiscal de l''entrepreneur. Seul ''micro'' est supporté pour l''instant.';
