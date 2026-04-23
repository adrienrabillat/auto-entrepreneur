-- ============================================================================
-- Fix : "new row violates row-level security policy" au RE-envoi d'une facture
-- ----------------------------------------------------------------------------
-- Cause : le schéma initial ne crée que les policies SELECT + INSERT sur le
-- bucket `invoices`. Or `upload(path, data, { upsert: true })` effectue un
-- UPDATE quand l'objet existe déjà. Sans policy UPDATE, Supabase refuse
-- avec le message RLS ci-dessus.
--
-- À exécuter dans : Supabase → SQL editor → New query → Run.
-- ============================================================================

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
