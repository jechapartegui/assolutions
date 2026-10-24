-- PREPROD : suppression ciblée des 33 séances 1772..1804
-- ROLLBACK par défaut. Remplacer par COMMIT après bilan.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='120s';
SELECT pg_advisory_xact_lock(hashtext('ASSOLUTIONS_MATCHS_2026_2027_PREPROD'));
CREATE TEMP TABLE _cibles(seance_id integer PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _cibles SELECT generate_series(1772,1804);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.seance s JOIN _cibles c USING(seance_id)
 WHERE s.saison_id=6 AND s.type_seance::text='MATCH';
 IF n<>33 THEN RAISE EXCEPTION 'ARRÊT : % sur 33 séances saison 6 MATCH trouvées',n; END IF;
 IF EXISTS (SELECT 1 FROM public.seance_professeur sp JOIN _cibles c USING(seance_id)
   JOIN public.cra_ligne cl ON cl.seance_professeur_id=sp.id)
 THEN RAISE EXCEPTION 'ARRÊT : lignes CRA sur ces interventions'; END IF;
 IF EXISTS (SELECT 1 FROM public.seance s JOIN _cibles c USING(seance_id)
 WHERE s.calendrier_id IS NOT NULL OR s.cours IS NOT NULL)
 THEN RAISE EXCEPTION 'ARRÊT : calendrier/cours lié à un match'; END IF;
END $$;
SELECT s.seance_id,s.date_seance,s.label FROM public.seance s JOIN _cibles c USING(seance_id) ORDER BY 1;
-- Les FK restantes bloqueront la suppression au lieu de détruire des données.
DELETE FROM public.seance_professeur sp USING _cibles c WHERE sp.seance_id=c.seance_id;
DELETE FROM public.lien_groupe lg USING _cibles c WHERE lg.object_type='séance' AND lg.object_id=c.seance_id;
UPDATE public.assolutions_match_import i SET seance_id=NULL,mis_a_jour_le=now()
 WHERE i.seance_id IN (SELECT seance_id FROM _cibles);
DELETE FROM public.assolutions_match_import WHERE cle LIKE 'MATCH2627_%';
DELETE FROM public.seance s USING _cibles c WHERE s.seance_id=c.seance_id;
SELECT count(*) AS restantes FROM public.seance s JOIN _cibles c USING(seance_id);
ROLLBACK;
