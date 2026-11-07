-- FIX-CAL-PUBLIC : option explicite, désactivée par défaut.
-- Aucun agenda Google n'est modifié par cette migration.
BEGIN;
ALTER TABLE public.calendrier
  ADD COLUMN IF NOT EXISTS est_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.calendrier
  ADD COLUMN IF NOT EXISTS public_acl_gere boolean NOT NULL DEFAULT false;
COMMIT;
