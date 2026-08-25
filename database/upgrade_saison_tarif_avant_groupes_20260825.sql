/*
  Assolutions - ordre tarif / groupes dans le tunnel - 2026-08-25
  ================================================================
  Additif et idempotent.

  false (défaut) : GROUPES -> TARIF
  true            : TARIF -> GROUPES
*/

BEGIN;

ALTER TABLE public.saison
  ADD COLUMN IF NOT EXISTS tarif_avant_groupes boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.saison.tarif_avant_groupes IS
  'false = groupes puis tarif ; true = tarif puis groupes';

COMMIT;

SELECT
  id,
  nom,
  active,
  tarif_avant_groupes
FROM public.saison
ORDER BY id;
