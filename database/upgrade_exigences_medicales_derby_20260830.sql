/*
  Assolutions - exigences médicales STANDARD / COMPETITION + Derby - 2026-08-30
  ============================================================================
  Cible actuelle US Ivry : project_id = 1, saison_id = 6.

  Objectif métier :
  - PREUVE_MEDICALE_STANDARD : règle générale d'inscription, obligatoire + bloquante.
  - PREUVE_MEDICALE_COMPETITION : règle de licence compétition, obligatoire mais
    non bloquante par défaut ; le groupe Derby la rend obligatoire + bloquante.
  - PHOTO : comportement actuel conservé ; Derby ajoute obligatoire + bloquante.
  - FFRS_DROIT_IMAGE : comportement actuel conservé ; Derby ajoute obligatoire
    + bloquante. Un consentement n'est satisfait que par OUI côté moteur.

  Le script conserve l'id de l'ancienne exigence médicale générale afin de ne
  pas casser les réponses/références historiques. Il est réexécutable.
*/

BEGIN;

/* Défensif : nécessaire si l'upgrade du 25/08 n'a pas encore été joué. */
ALTER TABLE public.exigence_dossier_portee
  ADD COLUMN IF NOT EXISTS obligatoire_override boolean NULL,
  ADD COLUMN IF NOT EXISTS bloquante_override boolean NULL;

DO $$
DECLARE
  v_project_id integer := 1;
  v_saison_id integer := 6;
  v_standard_id integer;
  v_competition_id integer;
  v_photo_id integer;
  v_image_id integer;
  v_derby_count integer;
BEGIN
  /* ---------------------------------------------------------------
     1. PREUVE_MEDICALE_STANDARD
     --------------------------------------------------------------- */

  /* Si la nouvelle règle STANDARD existe déjà, on la réutilise. */
  SELECT e.id
  INTO v_standard_id
  FROM public.exigence_dossier e
  WHERE e.project_id = v_project_id
    AND e.saison_id = v_saison_id
    AND upper(btrim(e.code)) = 'PREUVE_MEDICALE_STANDARD'
  ORDER BY e.id
  LIMIT 1;

  /* Sinon on recycle la règle historique actuelle (orthographe sans E). */
  IF v_standard_id IS NULL THEN
    SELECT e.id
    INTO v_standard_id
    FROM public.exigence_dossier e
    WHERE e.project_id = v_project_id
      AND e.saison_id = v_saison_id
      AND upper(btrim(e.code)) = 'PREUVE_MEDICAL_COMPETITION'
    ORDER BY e.id
    LIMIT 1;
  END IF;

  /* Compatibilité avec une éventuelle ancienne base où le code avait déjà le E :
     on ne recycle PREUVE_MEDICALE_COMPETITION que si elle est encore une règle
     d'INSCRIPTION avec portée GENERAL, donc bien l'ancienne règle générale. */
  IF v_standard_id IS NULL THEN
    SELECT e.id
    INTO v_standard_id
    FROM public.exigence_dossier e
    WHERE e.project_id = v_project_id
      AND e.saison_id = v_saison_id
      AND upper(btrim(e.code)) = 'PREUVE_MEDICALE_COMPETITION'
      AND e.usage = 'INSCRIPTION'
      AND EXISTS (
        SELECT 1
        FROM public.exigence_dossier_portee p
        WHERE p.exigence_id = e.id
          AND p.type_portee = 'GENERAL'
      )
    ORDER BY e.id
    LIMIT 1;
  END IF;

  IF v_standard_id IS NULL THEN
    INSERT INTO public.exigence_dossier (
      project_id, saison_id, code, libelle, description, usage,
      type_exigence, source_code, type_reponse, obligatoire, bloquante,
      age_min, age_max, validite_mois, texte_consentement, version_texte,
      ordre, actif, created_at, updated_at
    ) VALUES (
      v_project_id, v_saison_id,
      'PREUVE_MEDICALE_STANDARD', 'Situation médicale', NULL, 'INSCRIPTION',
      'PREUVE_MEDICALE', 'STANDARD', 'AUCUNE', true, true,
      NULL, NULL, NULL, NULL, NULL,
      1, true, now(), now()
    )
    RETURNING id INTO v_standard_id;
  ELSE
    UPDATE public.exigence_dossier
    SET code = 'PREUVE_MEDICALE_STANDARD',
        libelle = 'Situation médicale',
        usage = 'INSCRIPTION',
        type_exigence = 'PREUVE_MEDICALE',
        source_code = 'STANDARD',
        type_reponse = 'AUCUNE',
        obligatoire = true,
        bloquante = true,
        age_min = NULL,
        age_max = NULL,
        validite_mois = NULL,
        texte_consentement = NULL,
        version_texte = NULL,
        actif = true,
        updated_at = now()
    WHERE id = v_standard_id;
  END IF;

  /* STANDARD possède exactement une portée GENERAL, en héritage. */
  DELETE FROM public.exigence_dossier_portee
  WHERE exigence_id = v_standard_id;

  INSERT INTO public.exigence_dossier_portee (
    exigence_id, type_portee, cible_id, cible_code,
    obligatoire_override, bloquante_override
  ) VALUES (
    v_standard_id, 'GENERAL', NULL, NULL, NULL, NULL
  );

  /* ---------------------------------------------------------------
     2. PREUVE_MEDICALE_COMPETITION
     --------------------------------------------------------------- */

  SELECT e.id
  INTO v_competition_id
  FROM public.exigence_dossier e
  WHERE e.project_id = v_project_id
    AND e.saison_id = v_saison_id
    AND upper(btrim(e.code)) = 'PREUVE_MEDICALE_COMPETITION'
    AND e.id <> v_standard_id
  ORDER BY e.id
  LIMIT 1;

  IF v_competition_id IS NULL THEN
    INSERT INTO public.exigence_dossier (
      project_id, saison_id, code, libelle, description, usage,
      type_exigence, source_code, type_reponse, obligatoire, bloquante,
      age_min, age_max, validite_mois, texte_consentement, version_texte,
      ordre, actif, created_at, updated_at
    ) VALUES (
      v_project_id, v_saison_id,
      'PREUVE_MEDICALE_COMPETITION',
      'Preuve médicale compatible compétition',
      NULL, 'LICENCE', 'PREUVE_MEDICALE', 'COMPETITION', 'AUCUNE',
      true, false,
      NULL, NULL, NULL, NULL, NULL,
      1, true, now(), now()
    )
    RETURNING id INTO v_competition_id;
  ELSE
    UPDATE public.exigence_dossier
    SET libelle = 'Preuve médicale compatible compétition',
        usage = 'LICENCE',
        type_exigence = 'PREUVE_MEDICALE',
        source_code = 'COMPETITION',
        type_reponse = 'AUCUNE',
        obligatoire = true,
        bloquante = false,
        age_min = NULL,
        age_max = NULL,
        validite_mois = NULL,
        texte_consentement = NULL,
        version_texte = NULL,
        actif = true,
        updated_at = now()
    WHERE id = v_competition_id;
  END IF;

  /* Pas de GENERAL pour COMPETITION : uniquement le contexte licence + Derby. */
  DELETE FROM public.exigence_dossier_portee
  WHERE exigence_id = v_competition_id;

  INSERT INTO public.exigence_dossier_portee (
    exigence_id, type_portee, cible_id, cible_code,
    obligatoire_override, bloquante_override
  ) VALUES (
    v_competition_id, 'TYPE_LICENCE', NULL, 'COMPETITION', NULL, NULL
  );

  /* ---------------------------------------------------------------
     3. Groupe(s) Derby de la saison
     --------------------------------------------------------------- */

  SELECT count(*)
  INTO v_derby_count
  FROM public.groupes g
  JOIN public.saison s ON s.id = g.saison_id
  WHERE s.project_id = v_project_id
    AND g.saison_id = v_saison_id
    AND lower(btrim(g.nom)) LIKE '%derby%';

  IF v_derby_count = 0 THEN
    RAISE EXCEPTION
      'Aucun groupe Derby trouvé pour project_id=% / saison_id=%. Le script est annulé : vérifie le nom du groupe.',
      v_project_id, v_saison_id;
  END IF;

  /* COMPETITION : Derby devient explicitement obligatoire + bloquant. */
  INSERT INTO public.exigence_dossier_portee (
    exigence_id, type_portee, cible_id, cible_code,
    obligatoire_override, bloquante_override
  )
  SELECT v_competition_id, 'GROUPE', g.id, NULL, true, true
  FROM public.groupes g
  JOIN public.saison s ON s.id = g.saison_id
  WHERE s.project_id = v_project_id
    AND g.saison_id = v_saison_id
    AND lower(btrim(g.nom)) LIKE '%derby%'
    AND NOT EXISTS (
      SELECT 1
      FROM public.exigence_dossier_portee p
      WHERE p.exigence_id = v_competition_id
        AND p.type_portee = 'GROUPE'
        AND p.cible_id = g.id
    );

  UPDATE public.exigence_dossier_portee p
  SET obligatoire_override = true,
      bloquante_override = true
  WHERE p.exigence_id = v_competition_id
    AND p.type_portee = 'GROUPE'
    AND p.cible_id IN (
      SELECT g.id
      FROM public.groupes g
      JOIN public.saison s ON s.id = g.saison_id
      WHERE s.project_id = v_project_id
        AND g.saison_id = v_saison_id
        AND lower(btrim(g.nom)) LIKE '%derby%'
    );

  /* ---------------------------------------------------------------
     4. PHOTO : on ne modifie pas l'existant, on durcit seulement Derby
     --------------------------------------------------------------- */

  SELECT e.id
  INTO v_photo_id
  FROM public.exigence_dossier e
  WHERE e.project_id = v_project_id
    AND e.saison_id = v_saison_id
    AND upper(btrim(e.code)) = 'PHOTO'
  ORDER BY e.id
  LIMIT 1;

  IF v_photo_id IS NULL THEN
    RAISE EXCEPTION 'Exigence PHOTO introuvable pour project_id=% / saison_id=%',
      v_project_id, v_saison_id;
  END IF;

  INSERT INTO public.exigence_dossier_portee (
    exigence_id, type_portee, cible_id, cible_code,
    obligatoire_override, bloquante_override
  )
  SELECT v_photo_id, 'GROUPE', g.id, NULL, true, true
  FROM public.groupes g
  JOIN public.saison s ON s.id = g.saison_id
  WHERE s.project_id = v_project_id
    AND g.saison_id = v_saison_id
    AND lower(btrim(g.nom)) LIKE '%derby%'
    AND NOT EXISTS (
      SELECT 1
      FROM public.exigence_dossier_portee p
      WHERE p.exigence_id = v_photo_id
        AND p.type_portee = 'GROUPE'
        AND p.cible_id = g.id
    );

  UPDATE public.exigence_dossier_portee p
  SET obligatoire_override = true,
      bloquante_override = true
  WHERE p.exigence_id = v_photo_id
    AND p.type_portee = 'GROUPE'
    AND p.cible_id IN (
      SELECT g.id
      FROM public.groupes g
      JOIN public.saison s ON s.id = g.saison_id
      WHERE s.project_id = v_project_id
        AND g.saison_id = v_saison_id
        AND lower(btrim(g.nom)) LIKE '%derby%'
    );

  /* ---------------------------------------------------------------
     5. DROIT A L'IMAGE : même principe
     --------------------------------------------------------------- */

  SELECT e.id
  INTO v_image_id
  FROM public.exigence_dossier e
  WHERE e.project_id = v_project_id
    AND e.saison_id = v_saison_id
    AND upper(btrim(e.code)) = 'FFRS_DROIT_IMAGE'
  ORDER BY e.id
  LIMIT 1;

  IF v_image_id IS NULL THEN
    RAISE EXCEPTION 'Exigence FFRS_DROIT_IMAGE introuvable pour project_id=% / saison_id=%',
      v_project_id, v_saison_id;
  END IF;

  INSERT INTO public.exigence_dossier_portee (
    exigence_id, type_portee, cible_id, cible_code,
    obligatoire_override, bloquante_override
  )
  SELECT v_image_id, 'GROUPE', g.id, NULL, true, true
  FROM public.groupes g
  JOIN public.saison s ON s.id = g.saison_id
  WHERE s.project_id = v_project_id
    AND g.saison_id = v_saison_id
    AND lower(btrim(g.nom)) LIKE '%derby%'
    AND NOT EXISTS (
      SELECT 1
      FROM public.exigence_dossier_portee p
      WHERE p.exigence_id = v_image_id
        AND p.type_portee = 'GROUPE'
        AND p.cible_id = g.id
    );

  UPDATE public.exigence_dossier_portee p
  SET obligatoire_override = true,
      bloquante_override = true
  WHERE p.exigence_id = v_image_id
    AND p.type_portee = 'GROUPE'
    AND p.cible_id IN (
      SELECT g.id
      FROM public.groupes g
      JOIN public.saison s ON s.id = g.saison_id
      WHERE s.project_id = v_project_id
        AND g.saison_id = v_saison_id
        AND lower(btrim(g.nom)) LIKE '%derby%'
    );
END $$;

COMMIT;

/* -----------------------------------------------------------------
   CONTROLE PGADMIN : le résultat doit montrer :
   - STANDARD / GENERAL / overrides NULL / défaut true,true
   - COMPETITION / TYPE_LICENCE COMPETITION / overrides NULL / défaut true,false
   - COMPETITION / Derby / overrides true,true
   - PHOTO / TYPE_LICENCE COMPETITION conservé + Derby true,true
   - FFRS_DROIT_IMAGE / LOISIR + COMPETITION conservés + Derby true,true
   ----------------------------------------------------------------- */
SELECT
  e.id AS exigence_id,
  e.code,
  e.libelle,
  e.usage,
  e.type_exigence,
  e.source_code AS niveau_medical,
  e.obligatoire AS obligatoire_defaut,
  e.bloquante AS bloquante_defaut,
  p.type_portee,
  COALESCE(g.nom, p.cible_code, 'GENERAL') AS cible,
  p.obligatoire_override,
  p.bloquante_override
FROM public.exigence_dossier e
LEFT JOIN public.exigence_dossier_portee p ON p.exigence_id = e.id
LEFT JOIN public.groupes g
  ON p.type_portee = 'GROUPE'
 AND g.id = p.cible_id
WHERE e.project_id = 1
  AND e.saison_id = 6
  AND upper(btrim(e.code)) IN (
    'PREUVE_MEDICALE_STANDARD',
    'PREUVE_MEDICALE_COMPETITION',
    'PHOTO',
    'FFRS_DROIT_IMAGE'
  )
ORDER BY e.usage, e.ordre, e.code, p.type_portee, cible;
