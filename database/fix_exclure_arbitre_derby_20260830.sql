/*
  Assolutions - exclure le groupe Arbitre Roller Derby des exigences Derby
  2026-08-30

  Cible actuelle : project_id = 1, saison_id = 6.

  Le groupe "Arbitre Roller Derby" ne doit pas hériter des contraintes
  spécifiques aux pratiquants Derby :
  - preuve médicale COMPETITION bloquante ;
  - photo bloquante ;
  - droit à l'image bloquant.

  Script idempotent : peut être rejoué sans effet secondaire.
*/

BEGIN;

DELETE FROM public.exigence_dossier_portee p
USING public.exigence_dossier e,
      public.groupes g,
      public.saison s
WHERE p.exigence_id = e.id
  AND p.type_portee = 'GROUPE'
  AND p.cible_id = g.id
  AND g.saison_id = s.id
  AND e.project_id = 1
  AND e.saison_id = 6
  AND s.project_id = 1
  AND s.id = 6
  AND lower(btrim(g.nom)) = lower('Arbitre Roller Derby')
  AND upper(btrim(e.code)) IN (
    'PREUVE_MEDICALE_COMPETITION',
    'PHOTO',
    'FFRS_DROIT_IMAGE'
  );

COMMIT;

/* Contrôle pgAdmin : cette requête doit retourner 0 ligne. */
SELECT
  e.code,
  g.nom AS groupe,
  p.obligatoire_override,
  p.bloquante_override
FROM public.exigence_dossier_portee p
JOIN public.exigence_dossier e ON e.id = p.exigence_id
JOIN public.groupes g ON g.id = p.cible_id
WHERE p.type_portee = 'GROUPE'
  AND e.project_id = 1
  AND e.saison_id = 6
  AND lower(btrim(g.nom)) = lower('Arbitre Roller Derby')
  AND upper(btrim(e.code)) IN (
    'PREUVE_MEDICALE_COMPETITION',
    'PHOTO',
    'FFRS_DROIT_IMAGE'
  )
ORDER BY e.code;
