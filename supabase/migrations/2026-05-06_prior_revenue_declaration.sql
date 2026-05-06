-- ============================================================================
-- Migration : Branchement de prior_revenue sur le cycle URSSAF
-- Sprint 4 — 2026-05-06
-- ============================================================================
--
-- Contexte :
--   Avant cette migration, la table `prior_revenue` était orpheline : les
--   utilisateurs y saisissaient leur CA encaissé avant Asthia mais aucun
--   service ne le consommait. Les déclarations URSSAF ignoraient ces
--   chiffres.
--
-- Décision :
--   On branche prior_revenue dans le cycle URSSAF avec un flag
--   `already_declared` qui sert de garde-fou contre les doublons. Si un
--   AE a déjà déclaré une période manuellement avant Asthia, il coche le
--   flag → cette ligne ne sera pas re-soumise. Sinon, le cron URSSAF
--   l'agrège dans la déclaration mensuelle.
--
-- Colonnes ajoutées :
--   - already_declared  : true si le user a déjà soumis ce CA à l'URSSAF
--                         lui-même (ne pas re-soumettre).
--   - submitted_at      : trace de la soumission via Asthia (sert d'idempotence
--                         côté cron — si non null, on ne re-soumet pas).
--   - urssaf_reference  : référence retournée par l'URSSAF lors de la
--                         soumission rétroactive (pour le rapprochement).

ALTER TABLE public.prior_revenue
  ADD COLUMN IF NOT EXISTS already_declared boolean NOT NULL DEFAULT false;

ALTER TABLE public.prior_revenue
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE public.prior_revenue
  ADD COLUMN IF NOT EXISTS urssaf_reference text;

-- Index partiel pour accélérer le filtre du cron : "trouve les lignes
-- prior_revenue qu'il faut encore soumettre".
CREATE INDEX IF NOT EXISTS prior_revenue_pending_idx
  ON public.prior_revenue (user_id, period_year, period_month)
  WHERE already_declared = false AND submitted_at IS NULL;

COMMENT ON COLUMN public.prior_revenue.already_declared IS
  'Coché par l''AE pour les périodes qu''il a déjà déclarées manuellement à l''URSSAF avant d''utiliser Asthia. Empêche le cron de re-soumettre (ce qui créerait des cotisations en doublon).';

COMMENT ON COLUMN public.prior_revenue.submitted_at IS
  'Date à laquelle Asthia a soumis cette ligne à l''URSSAF (rétroactivement). Si non null, la ligne ne sera plus re-soumise par le cron.';
