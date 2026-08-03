BEGIN;

UPDATE public.exigence_dossier
SET obligatoire = false,
    bloquante = false,
    type_reponse = 'BOOLEEN',
    updated_at = now()
WHERE type_exigence = 'CONSENTEMENT'
  AND upper(replace(replace(btrim(code), ' ', '_'), '''', '')) IN (
    'DROIT_IMAGE',
    'DROIT_A_L_IMAGE',
    'DROIT_A_IMAGE'
  );

DELETE FROM public.exigence_dossier_portee p
USING public.exigence_dossier e
WHERE p.exigence_id = e.id
  AND e.type_exigence = 'CONSENTEMENT'
  AND upper(replace(replace(btrim(e.code), ' ', '_'), '''', '')) IN (
    'DROIT_IMAGE',
    'DROIT_A_L_IMAGE',
    'DROIT_A_IMAGE'
  );

INSERT INTO public.exigence_dossier_portee (
  exigence_id,
  type_portee,
  cible_id,
  cible_code
)
SELECT e.id, 'GENERAL', NULL, NULL
FROM public.exigence_dossier e
WHERE e.type_exigence = 'CONSENTEMENT'
  AND upper(replace(replace(btrim(e.code), ' ', '_'), '''', '')) IN (
    'DROIT_IMAGE',
    'DROIT_A_L_IMAGE',
    'DROIT_A_IMAGE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.exigence_dossier_portee p
    WHERE p.exigence_id = e.id
  );

COMMIT;
