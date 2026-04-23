-- Médiateur de la consommation (art. L616-1 Code de la consommation)
-- Mentions obligatoires sur les factures émises à des particuliers (BtoC).
-- Champs optionnels : tant qu'ils sont vides, aucune mention n'est ajoutée
-- au PDF et l'app fonctionne exactement comme avant.

alter table public.profiles
  add column if not exists mediator_name text,
  add column if not exists mediator_website text;
