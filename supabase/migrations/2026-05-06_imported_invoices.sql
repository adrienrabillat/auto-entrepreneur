-- ============================================================================
-- Migration : Factures importées depuis un autre logiciel
-- Sprint 4 — 2026-05-06
-- ============================================================================
--
-- Contexte :
--   Un AE qui change de logiciel (Henrri → Asthia, Tiime → Asthia, etc.)
--   veut rapatrier son historique pour avoir une vue continue de son CA,
--   mais SANS reproduire ce que l'ancien logiciel a déjà fait :
--     - Pas de re-déclaration URSSAF (sinon doublon de cotisations)
--     - Pas d'allocation dans la séquence légale Asthia (sinon trous)
--     - Pas d'envoi email au client (sinon spam)
--
-- Ces factures sont marquées avec `imported = true` et restent strictement
-- en lecture après import. Le contrôle est appliqué côté service (pas
-- d'allocation de numéro) et côté API (refus PATCH/DELETE/send/mark-paid).
--
-- Règles d'isolation :
--   - declaration-service : EXCLU (clause `NOT imported` ajoutée Sprint 4)
--   - invoice-service.createInvoiceRow : skip de la numérotation
--   - mark-paid, send, delete, edit : refusent les imported
--   - threshold/export : INCLUS (vue d'ensemble cohérente)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS imported boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- Source de l'import (libre, ex: "henrri-export-2025.xlsx") — utile pour
-- diagnostiquer si l'AE re-importe le même fichier.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS import_source text;

-- Index pour accélérer les filtres "factures non importées" (très utilisé
-- dans declaration-service.ts).
CREATE INDEX IF NOT EXISTS invoices_user_not_imported_idx
  ON public.invoices (user_id, paid_at)
  WHERE imported = false AND status = 'paid';

COMMENT ON COLUMN public.invoices.imported IS
  'true : facture importée depuis un autre logiciel via /import/factures. Figée en lecture, exclue des déclarations URSSAF Asthia (déjà déclarée ailleurs) et de la séquence légale (numéro vient de l''ancien logiciel). Incluse dans le calcul du seuil annuel et l''export Excel.';
