-- EXG-FIX04 : migration additive, à appliquer AVANT le nouveau backend.
-- Les calendriers existants conservent leur comportement actuel.
BEGIN;
ALTER TABLE public.calendrier
  ADD COLUMN IF NOT EXISTS diffusion_mode varchar(20) NOT NULL DEFAULT 'INVITATIONS';
ALTER TABLE public.calendrier
  DROP CONSTRAINT IF EXISTS chk_calendrier_diffusion_mode;
ALTER TABLE public.calendrier
  ADD CONSTRAINT chk_calendrier_diffusion_mode
  CHECK (diffusion_mode IN ('ABONNEMENT','INVITATIONS','MIXTE'));
CREATE TABLE IF NOT EXISTS public.calendrier_destinataire (
  calendrier_id integer NOT NULL REFERENCES public.calendrier(id) ON DELETE CASCADE,
  compte_id integer NOT NULL REFERENCES public.compte(id) ON DELETE CASCADE,
  statut varchar(32) NOT NULL DEFAULT 'NON_CONTACTE',
  invitation_forcee boolean NOT NULL DEFAULT false,
  propose_le timestamptz,
  relance_le timestamptz,
  confirme_le timestamptz,
  date_maj timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (calendrier_id, compte_id),
  CONSTRAINT chk_calendrier_destinataire_statut
  CHECK (statut IN ('NON_CONTACTE','PROPOSE','CONFIRME_MANUELLEMENT','INVITATIONS_FORCEES','EXCLU'))
);
COMMIT;
