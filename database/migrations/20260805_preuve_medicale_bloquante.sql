/*
  La situation médicale est obligatoire pour finaliser une inscription.
  La règle est également imposée côté serveur afin qu'un changement futur de
  paramétrage ne permette pas de contourner le contrôle.
*/

BEGIN;

UPDATE public.exigence_dossier
SET obligatoire = true,
    bloquante = true,
    updated_at = now()
WHERE type_exigence = 'PREUVE_MEDICALE';

COMMIT;

SELECT id, code, libelle, usage, obligatoire, bloquante
FROM public.exigence_dossier
WHERE type_exigence = 'PREUVE_MEDICALE'
ORDER BY project_id, saison_id NULLS FIRST, id;
