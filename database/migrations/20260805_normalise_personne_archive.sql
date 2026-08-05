/*
  Les personnes historiques avec archive = NULL étaient visibles dans
  Mon compte, mais absentes du tunnel qui filtre archive = false.
*/

BEGIN;

UPDATE public.personne
SET archive = false
WHERE archive IS NULL;

ALTER TABLE public.personne
  ALTER COLUMN archive SET DEFAULT false,
  ALTER COLUMN archive SET NOT NULL;

COMMIT;

SELECT id, first_name, last_name, compte, archive
FROM public.personne
ORDER BY id;
