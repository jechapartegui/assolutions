/*
  Assolutions - remise à zéro d'une inscription pour rejouer les tests
  ====================================================================

  Modifier UNIQUEMENT les deux valeurs ci-dessous :
    - personne_id
    - saison_id

  Le script supprime :
    - les réponses du dossier pour cette personne et cette saison ;
    - les preuves médicales saisies pour cette saison ;
    - le dossier personne/saison ;
    - les lignes du tunnel de souscription pour cette personne ;
    - ses affectations aux groupes de cette saison ;
    - son inscription_saison ;
    - les souscriptions devenues vides.

  Le script conserve :
    - la personne, ses contacts et son adresse ;
    - sa photo ;
    - ses documents durables non directement liés au dossier supprimé ;
    - les inscriptions des autres personnes d'une souscription familiale.

  Le résultat détaillé apparaît dans "Data Output" à la fin.
*/

DROP TABLE IF EXISTS pg_temp.reset_inscription_parametres;
CREATE TEMP TABLE reset_inscription_parametres (
  personne_id integer NOT NULL,
  saison_id integer NOT NULL
);

/* >>>>>>>>>>>>>>>>> MODIFIER ICI <<<<<<<<<<<<<<<<< */
INSERT INTO reset_inscription_parametres (personne_id, saison_id)
VALUES (
  123,  -- ID PERSONNE
  7     -- ID SAISON
);
/* >>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<< */

BEGIN;

DROP TABLE IF EXISTS pg_temp.reset_inscription_log;
CREATE TEMP TABLE reset_inscription_log (
  ordre serial,
  operation text NOT NULL,
  nb_lignes integer NOT NULL
);

DROP TABLE IF EXISTS pg_temp.reset_souscriptions;
CREATE TEMP TABLE reset_souscriptions (
  id integer PRIMARY KEY
);

DROP TABLE IF EXISTS pg_temp.reset_lignes;
CREATE TEMP TABLE reset_lignes (
  id integer PRIMARY KEY,
  souscription_id integer NOT NULL
);

DROP TABLE IF EXISTS pg_temp.reset_documents;
CREATE TEMP TABLE reset_documents (
  id integer PRIMARY KEY
);

DO $$
DECLARE
  p_personne_id integer;
  p_saison_id integer;
  v_count integer;
BEGIN
  SELECT personne_id, saison_id
  INTO p_personne_id, p_saison_id
  FROM reset_inscription_parametres;

  IF NOT EXISTS (
    SELECT 1 FROM public.personne WHERE id = p_personne_id
  ) THEN
    RAISE EXCEPTION 'Personne % introuvable', p_personne_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.saison WHERE id = p_saison_id
  ) THEN
    RAISE EXCEPTION 'Saison % introuvable', p_saison_id;
  END IF;

  IF to_regclass('public.souscription') IS NULL
     OR to_regclass('public.souscription_personne') IS NULL
     OR to_regclass('public.reponse_exigence_dossier') IS NULL
     OR to_regclass('public.preuve_medicale') IS NULL THEN
    RAISE EXCEPTION
      'Le nouveau modèle de souscription n''est pas installé sur cette base';
  END IF;

  INSERT INTO reset_souscriptions (id)
  SELECT DISTINCT s.id
  FROM public.souscription s
  JOIN public.souscription_personne sp
    ON sp.souscription_id = s.id
  WHERE s.saison_id = p_saison_id
    AND sp.personne_id = p_personne_id
  ON CONFLICT DO NOTHING;

  INSERT INTO reset_lignes (id, souscription_id)
  SELECT sp.id, sp.souscription_id
  FROM public.souscription_personne sp
  JOIN public.souscription s
    ON s.id = sp.souscription_id
  WHERE s.saison_id = p_saison_id
    AND sp.personne_id = p_personne_id
  ON CONFLICT DO NOTHING;

  /*
    On mémorise les documents directement créés pour une réponse ou une preuve
    de cette saison. La photo n'est jamais ajoutée à cette liste.
  */
  INSERT INTO reset_documents (id)
  SELECT DISTINCT r.document_id
  FROM public.reponse_exigence_dossier r
  JOIN public.document d ON d.id = r.document_id
  WHERE r.personne_id = p_personne_id
    AND r.saison_id = p_saison_id
    AND r.document_id IS NOT NULL
    AND lower(btrim(d.typedoc)) <> 'photo'
  ON CONFLICT DO NOTHING;

  INSERT INTO reset_documents (id)
  SELECT DISTINCT pm.document_id
  FROM public.preuve_medicale pm
  JOIN public.document d ON d.id = pm.document_id
  WHERE pm.personne_id = p_personne_id
    AND pm.saison_id = p_saison_id
    AND pm.document_id IS NOT NULL
    AND lower(btrim(d.typedoc)) <> 'photo'
  ON CONFLICT DO NOTHING;

  DELETE FROM public.reponse_exigence_dossier r
  WHERE r.personne_id = p_personne_id
    AND r.saison_id = p_saison_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Réponses aux exigences supprimées', v_count);

  DELETE FROM public.preuve_medicale pm
  WHERE pm.personne_id = p_personne_id
    AND pm.saison_id = p_saison_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Preuves médicales de la saison supprimées', v_count);

  DELETE FROM public.dossier_personne_saison d
  WHERE d.personne_id = p_personne_id
    AND d.saison_id = p_saison_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Dossiers personne/saison supprimés', v_count);

  DELETE FROM public.souscription_evenement e
  USING reset_souscriptions rs
  WHERE e.souscription_id = rs.id
    AND (
      e.details ->> 'personne_id' = p_personne_id::text
      OR e.type_evenement LIKE '%_' || p_personne_id::text
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Événements individualisés supprimés', v_count);

  DELETE FROM public.souscription_personne_groupe spg
  USING reset_lignes rl
  WHERE spg.souscription_personne_id = rl.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Choix de groupes du tunnel supprimés', v_count);

  DELETE FROM public.souscription_personne sp
  USING reset_lignes rl
  WHERE sp.id = rl.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Lignes de souscription supprimées', v_count);

  /*
    Une souscription familiale peut conserver d'autres personnes.
    Dans ce cas, on recalcule les montants au lieu de la supprimer.
  */
  WITH totaux AS (
    SELECT
      s.id,
      COALESCE(SUM(sp.prix_initial_centimes), 0)::integer
        AS montant_initial,
      COALESCE(SUM(sp.remise_centimes), 0)::integer
        AS montant_remise,
      COALESCE(SUM(sp.prix_final_centimes), 0)::integer
        AS montant_total
    FROM public.souscription s
    JOIN reset_souscriptions rs ON rs.id = s.id
    JOIN public.souscription_personne sp
      ON sp.souscription_id = s.id
    GROUP BY s.id
  )
  UPDATE public.souscription s
  SET montant_initial_centimes = t.montant_initial,
      montant_remise_centimes = t.montant_remise,
      montant_total_centimes = t.montant_total,
      updated_at = now()
  FROM totaux t
  WHERE s.id = t.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Souscriptions familiales recalculées', v_count);

  DELETE FROM public.souscription_evenement e
  USING reset_souscriptions rs
  WHERE e.souscription_id = rs.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.souscription_personne sp
      WHERE sp.souscription_id = rs.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Événements des souscriptions vides supprimés', v_count);

  DELETE FROM public.souscription s
  USING reset_souscriptions rs
  WHERE s.id = rs.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.souscription_personne sp
      WHERE sp.souscription_id = s.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Souscriptions devenues vides supprimées', v_count);

  DELETE FROM public.lien_groupe lg
  USING public.groupes g
  WHERE lg.groupe_id = g.id
    AND g.saison_id = p_saison_id
    AND lg.object_id = p_personne_id
    AND lower(btrim(lg.object_type)) IN ('rider', 'member', 'personne');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Affectations aux groupes supprimées', v_count);

  DELETE FROM public.inscription_saison ins
  WHERE ins.personne_id = p_personne_id
    AND ins.saison_id = p_saison_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Inscriptions saison supprimées', v_count);

  /*
    Suppression uniquement des documents explicitement liés au dossier effacé,
    devenus orphelins, et jamais des photos.
  */
  DELETE FROM public.document d
  USING reset_documents rd
  WHERE d.id = rd.id
    AND lower(btrim(d.typedoc)) <> 'photo'
    AND NOT EXISTS (
      SELECT 1
      FROM public.reponse_exigence_dossier r
      WHERE r.document_id = d.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.preuve_medicale pm
      WHERE pm.document_id = d.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reset_inscription_log (operation, nb_lignes)
  VALUES ('Documents de test devenus orphelins supprimés', v_count);
END $$;

COMMIT;

/* Journal visible dans Data Output. */
SELECT ordre, operation, nb_lignes
FROM reset_inscription_log
ORDER BY ordre;

/* Vérification finale synthétique. */
SELECT
  p.personne_id,
  p.saison_id,
  (
    SELECT count(*)
    FROM public.inscription_saison i
    WHERE i.personne_id = p.personne_id
      AND i.saison_id = p.saison_id
  ) AS inscriptions_saison_restantes,
  (
    SELECT count(*)
    FROM public.souscription_personne sp
    JOIN public.souscription s ON s.id = sp.souscription_id
    WHERE sp.personne_id = p.personne_id
      AND s.saison_id = p.saison_id
  ) AS lignes_souscription_restantes,
  (
    SELECT count(*)
    FROM public.reponse_exigence_dossier r
    WHERE r.personne_id = p.personne_id
      AND r.saison_id = p.saison_id
  ) AS reponses_dossier_restantes,
  (
    SELECT count(*)
    FROM public.preuve_medicale pm
    WHERE pm.personne_id = p.personne_id
      AND pm.saison_id = p.saison_id
  ) AS preuves_medicales_restantes
FROM reset_inscription_parametres p;
