/*
  Aligne les exigences communes du dossier :
  - le droit à l'image doit être proposé à tout le monde ;
  - une situation médicale doit être renseignée pour toute licence ;
  - la présence d'une photo doit être visible pour chaque personne.

  La portée détermine l'affichage. Le caractère obligatoire/bloquant détermine
  uniquement la complétude et ne masque jamais une exigence.
*/

BEGIN;

UPDATE public.exigence_dossier
SET usage = 'LICENCE',
    obligatoire = true,
    bloquante = false,
    type_reponse = 'BOOLEEN',
    updated_at = now()
WHERE upper(replace(btrim(code), ' ', '_')) IN (
  'DROIT_IMAGE',
  'DROIT_A_L_IMAGE',
  'DROIT_A_IMAGE'
)
AND type_exigence = 'CONSENTEMENT';

DELETE FROM public.exigence_dossier_portee p
USING public.exigence_dossier e
WHERE p.exigence_id = e.id
  AND upper(replace(btrim(e.code), ' ', '_')) IN (
    'DROIT_IMAGE',
    'DROIT_A_L_IMAGE',
    'DROIT_A_IMAGE'
  )
  AND e.type_exigence = 'CONSENTEMENT';

INSERT INTO public.exigence_dossier_portee (
  exigence_id,
  type_portee,
  cible_id,
  cible_code
)
SELECT e.id, 'GENERAL', NULL, NULL
FROM public.exigence_dossier e
WHERE upper(replace(btrim(e.code), ' ', '_')) IN (
    'DROIT_IMAGE',
    'DROIT_A_L_IMAGE',
    'DROIT_A_IMAGE'
  )
  AND e.type_exigence = 'CONSENTEMENT'
  AND NOT EXISTS (
    SELECT 1
    FROM public.exigence_dossier_portee p
    WHERE p.exigence_id = e.id
      AND p.type_portee = 'GENERAL'
  );

UPDATE public.exigence_dossier
SET usage = 'LICENCE',
    obligatoire = true,
    bloquante = false,
    updated_at = now()
WHERE type_exigence = 'PREUVE_MEDICALE';

DELETE FROM public.exigence_dossier_portee p
USING public.exigence_dossier e
WHERE p.exigence_id = e.id
  AND e.type_exigence = 'PREUVE_MEDICALE';

INSERT INTO public.exigence_dossier_portee (
  exigence_id,
  type_portee,
  cible_id,
  cible_code
)
SELECT e.id, 'GENERAL', NULL, NULL
FROM public.exigence_dossier e
WHERE e.type_exigence = 'PREUVE_MEDICALE'
  AND NOT EXISTS (
    SELECT 1
    FROM public.exigence_dossier_portee p
    WHERE p.exigence_id = e.id
      AND p.type_portee = 'GENERAL'
  );

/* Une exigence PHOTO informative est créée pour chaque contexte projet/saison
   déjà paramétré. Elle ne bloque pas l'inscription. */
INSERT INTO public.exigence_dossier (
  project_id,
  saison_id,
  code,
  libelle,
  description,
  usage,
  type_exigence,
  source_code,
  type_reponse,
  obligatoire,
  bloquante,
  ordre,
  actif,
  created_at,
  updated_at
)
SELECT DISTINCT
  e.project_id,
  e.saison_id,
  'PHOTO_PRESENTE',
  'Photo de la personne',
  'Indique si une photo est déjà enregistrée dans le dossier de la personne.',
  'INSCRIPTION',
  'DOCUMENT',
  'PHOTO',
  'DOCUMENT',
  false,
  false,
  1,
  true,
  now(),
  now()
FROM public.exigence_dossier e
WHERE NOT EXISTS (
  SELECT 1
  FROM public.exigence_dossier existing
  WHERE existing.project_id = e.project_id
    AND COALESCE(existing.saison_id, 0) = COALESCE(e.saison_id, 0)
    AND upper(btrim(existing.source_code)) = 'PHOTO'
    AND existing.type_exigence = 'DOCUMENT'
);

INSERT INTO public.exigence_dossier_portee (
  exigence_id,
  type_portee,
  cible_id,
  cible_code
)
SELECT e.id, 'GENERAL', NULL, NULL
FROM public.exigence_dossier e
WHERE e.type_exigence = 'DOCUMENT'
  AND upper(btrim(e.source_code)) = 'PHOTO'
  AND NOT EXISTS (
    SELECT 1
    FROM public.exigence_dossier_portee p
    WHERE p.exigence_id = e.id
  );

COMMIT;
