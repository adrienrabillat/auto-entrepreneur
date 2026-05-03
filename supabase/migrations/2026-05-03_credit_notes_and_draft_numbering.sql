-- ============================================================================
-- Migration : Avoirs (credit notes) + Numérotation brouillons
-- Sprint 3 — 2026-05-03
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Avoirs — invoice_type + related_invoice_id
-- ---------------------------------------------------------------------------

-- Type de document : 'standard' pour les factures classiques,
-- 'credit_note' pour les avoirs d'annulation (totale ou partielle).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'standard'
    CHECK (invoice_type IN ('standard', 'credit_note'));

-- FK vers la facture originale quand c'est un avoir.
-- ON DELETE SET NULL : si la facture originale est supprimée (ne devrait
-- pas arriver car elle est figée), on ne veut pas perdre l'avoir.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid
    REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Permettre de lier avoir → facture originale dans les queries.
CREATE INDEX IF NOT EXISTS invoices_related_idx
  ON public.invoices(related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Numérotation brouillons — draft_number
-- ---------------------------------------------------------------------------

-- Numéro temporaire (ex: "BROUILLON-001") attribué à la création.
-- Quand la facture est validée (envoi/mark-paid), le vrai numéro
-- séquentiel est attribué dans `number` et `draft_number` est conservé
-- comme trace.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS draft_number text;

-- Seed pour la séquence brouillons. Séparé du seed factures validées
-- pour que les brouillons supprimés ne créent pas de trous dans la
-- numérotation légale.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS draft_number_seed integer NOT NULL DEFAULT 0
    CHECK (draft_number_seed >= 0);

-- ---------------------------------------------------------------------------
-- 3. Statut 'credit_note' dans la check constraint
--    On élargit la check existante pour accepter 'credit_note' comme statut
--    additionnel (utilisé par les avoirs pour les distinguer visuellement
--    dans la liste).
-- ---------------------------------------------------------------------------
-- Note : on ne change PAS la constraint status car les avoirs ont aussi un
-- statut draft/sent/paid. Le type 'credit_note' est porté par invoice_type.

-- ---------------------------------------------------------------------------
-- 4. Relaxer la contrainte amount_cents > 0 pour les avoirs
-- ---------------------------------------------------------------------------
-- Les avoirs ont un amount_cents négatif (convention comptable).
-- On remplace la CHECK simple par une CHECK conditionnelle.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amount_cents_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_cents_check
  CHECK (
    (invoice_type = 'credit_note' AND amount_cents < 0) OR
    (invoice_type = 'standard' AND amount_cents > 0)
  );
