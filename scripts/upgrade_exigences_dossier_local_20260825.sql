/*
  Assolutions - upgrade LOCAL des exigences de dossier - 2026-08-25
  =================================================================
  À exécuter APRÈS restauration de ton dump local actuel.

  Script additif et idempotent : il ne supprime aucune donnée.
  NULL = la portée hérite des valeurs obligatoire/bloquante de l'exigence.
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

/* Vérification 1 : les deux nouvelles colonnes doivent apparaître. */
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exigence_dossier_portee'
  AND column_name IN ('obligatoire_override', 'bloquante_override')
ORDER BY column_name;

/* Vérification 2 : vue complète du paramétrage actuel des exigences. */
SELECT
  e.id,
  e.code,
  e.libelle,
  e.usage,
  e.type_exigence,
  e.source_code,
  e.obligatoire AS obligatoire_defaut,
  e.bloquante AS bloquante_defaut,
  p.id AS portee_id,
  p.type_portee,
  p.cible_id,
  p.cible_code,
  p.obligatoire_override,
  p.bloquante_override
FROM public.exigence_dossier e
LEFT JOIN public.exigence_dossier_portee p
  ON p.exigence_id = e.id
ORDER BY e.ordre, e.id, p.id;
