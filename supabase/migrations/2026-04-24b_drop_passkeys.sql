-- Suppression du verrou passkey (WebAuthn) : la sécurité repose désormais
-- uniquement sur la session Google OAuth, ce qui est suffisant pour un usage
-- familial (3 utilisateurs). Voir migration 2026-04-23_passkeys.sql pour
-- l'historique. On drop la table + les policies associées, cascade pour
-- nettoyer les éventuels index/contraintes restants.

drop table if exists public.user_passkeys cascade;
