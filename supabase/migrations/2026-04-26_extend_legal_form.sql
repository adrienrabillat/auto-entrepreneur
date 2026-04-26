-- Élargit la contrainte CHECK sur profiles.legal_form pour accepter
-- les principales formes juridiques françaises identifiables via le
-- référentiel INSEE des Catégories Juridiques (TR1).
--
-- Avant : 'EI' / 'EURL' / 'SASU' / 'Autre' uniquement
-- Après : + SARL / SAS / SA / SCI

alter table public.profiles
  drop constraint if exists profiles_legal_form_check;

alter table public.profiles
  add constraint profiles_legal_form_check
  check (legal_form in ('EI', 'EURL', 'SARL', 'SAS', 'SASU', 'SA', 'SCI', 'Autre'));
