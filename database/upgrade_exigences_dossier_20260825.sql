/*
  Assolutions - évolution des exigences de dossier - 2026-08-25
  =============================================================
  Additif et idempotent.

  Une portée peut désormais surcharger les valeurs obligatoire/bloquante de
  l'exigence. NULL signifie "hériter de l'exigence" et préserve donc le
  comportement de toutes les exigences existantes.
*/

BEGIN;

ALTER TABLE public.exigence_dossier_portee
  ADD COLUMN IF NOT EXISTS obligatoire_override boolean NULL,
  ADD COLUMN IF NOT EXISTS bloquante_override boolean NULL;

COMMENT ON COLUMN public.exigence_dossier_portee.obligatoire_override IS
  'NULL = hérite de exigence_dossier.obligatoire ; sinon surcharge pour cette portée.';

COMMENT ON COLUMN public.exigence_dossier_portee.bloquante_override IS
  'NULL = hérite de exigence_dossier.bloquante ; sinon surcharge pour cette portée.';

COMMIT;
