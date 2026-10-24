-- ============================================================================
-- ASSOLUTIONS / US IVRY ROLLER : IMPORT DES MATCHS 2026-2027 EN PREPROD
-- CORRECTIF V3 : identifiants 41/42/43/45/48 = contrats (contrat_prof.id), et non professeur_id.
-- Conserve le contrôle de saison et de validité du contrat, sans créer de contrat.
-- Matchs du 12/12 reportes au 13/12 (cles d'import stables pour eviter les doublons).
-- 29 matchs, 9 journées, 7 groupes (28,29,30,45,46,47,48), 4 lieux (2,5,6,7).
-- Aucun Google ni cours récurrent. Interventions professeur liées aux contrats actifs.
--
-- DATES INTERPRÉTÉES : « 22/ » = 22/11/2026 ; 08/05 = 08/05/2027.
-- Les heures non précisées sont PROVISOIRES 09h00 -> 18h00 (540 min).
-- Les heures connues sont 22/11 à 14h30, 17/01 à 14h45 et 08/05 à 19h30 (120 min).
-- Toutes les séances indiquent : « RDV directement au gymnase ».
-- U15 : une séance par journée pour les deux équipes. Chris absent des IDs : non lié.
--
-- IMPORTANT : connexion PostgreSQL PREPROD uniquement. Vérifiez la base
-- dans VS Code. Ne rejouez ni la migration Google ni la fusion des séances.
-- TEST SÉCURISÉ : la dernière instruction est ROLLBACK.
-- Si le bilan est bon, remplacer UNIQUEMENT le dernier ROLLBACK par COMMIT,
-- puis exécuter LE SCRIPT ENTIER sur PREPROD.
-- Si une transaction est déjà ouverte dans votre session, terminer par
-- ROLLBACK; avant de lancer ce script, afin d'éviter un BEGIN imbriqué.
-- Script réexécutable : registre technique permanent assolutions_match_import.
-- Un second passage ne duplique ni les séances ni les liens de groupe.
-- Les modifications manuelles ultérieures sur des séances déjà importées
-- (horaires, dates, noms) ne sont pas écrasées par un second passage.
-- ============================================================================

BEGIN;
SET LOCAL TIME ZONE 'Europe/Paris';
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('ASSOLUTIONS_MATCHS_2026_2027_PREPROD'));

-- Source des 29 matchs : une clé stable et UNIQUE par rencontre.
CREATE TEMP TABLE _matchs_import_plan (
  cle text PRIMARY KEY,
  jour date NOT NULL,
  libelle varchar(255) NOT NULL,
  groupe_id integer NOT NULL,
  lieu_id integer NOT NULL,
  heure_debut varchar(10) NOT NULL,
  duree_minutes integer NOT NULL,
  heure_confirmee boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO _matchs_import_plan
  (cle,jour,libelle,groupe_id,lieu_id,heure_debut,duree_minutes,heure_confirmee)
VALUES
  ('MATCH2627_20261115_RB_FR_DE_F', '2026-11-15'::date, 'RollBall France (F) vs Allemagne (F)', 45, 7, '09:00', 540, false),
  ('MATCH2627_20261115_RB_FR_DE_H', '2026-11-15'::date, 'RollBall France (H) vs Allemagne (H)', 46, 7, '09:00', 540, false),
  ('MATCH2627_20261115_RS_AMICAL', '2026-11-15'::date, 'RollerSoccer - Match amical', 48, 7, '09:00', 540, false),
  ('MATCH2627_20261122_RS_N1_CABRIES', '2026-11-22'::date, 'RollerSoccer N1 vs Cabriès (à Savigny)', 48, 5, '14:30', 120, true),
  ('MATCH2627_20261212_RS_U11_SAVIGNY', '2026-12-13'::date, 'RollerSoccer U11 vs Savigny', 30, 7, '09:00', 540, false),
  ('MATCH2627_20261212_RS_U15_E1_SAVIGNY', '2026-12-13'::date, 'RollerSoccer U15 - Match équipe 1 puis Match équipe 2 vs Savigny', 29, 7, '09:00', 540, false),
  ('MATCH2627_20261212_RS_U19_SAVIGNY', '2026-12-13'::date, 'RollerSoccer U19 - Match équipe 1 puis Match équipe 2 vs Savigny', 28, 7, '09:00', 540, false),
  ('MATCH2627_20261212_RS_N1_SAVIGNY', '2026-12-13'::date, 'RollerSoccer N1 vs Savigny', 48, 7, '09:00', 540, false),
  ('MATCH2627_20261212_RS_ELITE_SAVIGNY', '2026-12-13'::date, 'RollerSoccer Élite vs Savigny', 47, 7, '09:00', 540, false),
  ('MATCH2627_20270117_RS_N1_CABRIES', '2027-01-17'::date, 'RollerSoccer N1 vs Cabriès (à domicile)', 48, 2, '14:45', 120, true),
  ('MATCH2627_20270124_RS_U11_ARGENTEUIL', '2027-01-24'::date, 'RollerSoccer U11 vs Argenteuil', 30, 7, '09:00', 540, false),
  ('MATCH2627_20270124_RS_U15_E1_ARGENTEUIL', '2027-01-24'::date, 'RollerSoccer U15 - Match équipe 1 puis Match équipe 2 vs Argenteuil', 29, 7, '09:00', 540, false),
  ('MATCH2627_20270124_RS_U19_ARGENTEUIL', '2027-01-24'::date, 'RollerSoccer U19 - Match équipe 1 puis Match équipe 2 vs Argenteuil', 28, 7, '09:00', 540, false),
  ('MATCH2627_20270124_RS_N1_ARGENTEUIL', '2027-01-24'::date, 'RollerSoccer N1 vs Argenteuil', 48, 7, '09:00', 540, false),
  ('MATCH2627_20270131_RS_U11_SAVIGNY', '2027-01-31'::date, 'RollerSoccer U11 vs Savigny', 30, 5, '09:00', 540, false),
  ('MATCH2627_20270131_RS_U15_E1_SAVIGNY', '2027-01-31'::date, 'RollerSoccer U15 - Match équipe 1 puis Match équipe 2 vs Savigny', 29, 5, '09:00', 540, false),
  ('MATCH2627_20270131_RS_U19_SAVIGNY', '2027-01-31'::date, 'RollerSoccer U19 - Match équipe 1 puis Match équipe 2 vs Savigny', 28, 5, '09:00', 540, false),
  ('MATCH2627_20270131_RS_N1_SAVIGNY', '2027-01-31'::date, 'RollerSoccer N1 vs Savigny', 48, 5, '09:00', 540, false),
  ('MATCH2627_20270131_RS_ELITE_SAVIGNY', '2027-01-31'::date, 'RollerSoccer Élite vs Savigny', 47, 5, '09:00', 540, false),
  ('MATCH2627_20270228_RS_U15_E1_PONTAULT_COMBAULT', '2027-02-28'::date, 'RollerSoccer U15 - Match équipe 1 puis Match équipe 2 vs Pontault-Combault', 29, 7, '09:00', 540, false),
  ('MATCH2627_20270228_RS_U19_PONTAULT_COMBAULT', '2027-02-28'::date, 'RollerSoccer U19 - Match équipe 1 puis Match équipe 2 vs Pontault-Combault', 28, 7, '09:00', 540, false),
  ('MATCH2627_20270228_RS_N1_PONTAULT_COMBAULT', '2027-02-28'::date, 'RollerSoccer N1 vs Pontault-Combault', 48, 7, '09:00', 540, false),
  ('MATCH2627_20270228_RS_ELITE_PONTAULT_COMBAULT', '2027-02-28'::date, 'RollerSoccer Élite vs Pontault-Combault', 47, 7, '09:00', 540, false),
  ('MATCH2627_20270321_RS_U11_BRUXELLES', '2027-03-21'::date, 'RollerSoccer U11 vs Bruxelles', 30, 7, '09:00', 540, false),
  ('MATCH2627_20270321_RS_U15_E1_BRUXELLES', '2027-03-21'::date, 'RollerSoccer U15 - Match équipe 1 puis Match équipe 2 vs Bruxelles', 29, 7, '09:00', 540, false),
  ('MATCH2627_20270321_RS_U19_BRUXELLES', '2027-03-21'::date, 'RollerSoccer U19 - Match équipe 1 puis Match équipe 2 vs Bruxelles', 28, 7, '09:00', 540, false),
  ('MATCH2627_20270321_RS_N1_BRUXELLES', '2027-03-21'::date, 'RollerSoccer N1 vs Bruxelles', 48, 7, '09:00', 540, false),
  ('MATCH2627_20270321_RS_ELITE_BRUXELLES', '2027-03-21'::date, 'RollerSoccer Élite vs Bruxelles', 47, 7, '09:00', 540, false),
  ('MATCH2627_20270508_RS_ELITE_BRUXELLES', '2027-05-08'::date, 'RollerSoccer Élite vs Bruxelles', 47, 6, '19:30', 120, true);

-- Registre évitant les doublons même si les horaires ou le libellé sont modifiés.
-- Tout cela disparaît aussi si vous laissez ROLLBACK en fin de script.
CREATE TABLE IF NOT EXISTS public.assolutions_match_import (
  cle text PRIMARY KEY,
  seance_id integer UNIQUE REFERENCES public.seance(seance_id) ON DELETE SET NULL,
  importe_le timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le timestamptz NOT NULL DEFAULT now()
);

-- Empêche une création concurrente portant le même nom/date pendant l'import.
-- Le verrou n'est conservé que jusqu'au ROLLBACK / COMMIT final.
LOCK TABLE public.seance, public.lien_groupe,
           public.assolutions_match_import IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE _matchs_import_resultats (
  cle text PRIMARY KEY,
  seance_id integer NOT NULL,
  action text NOT NULL
) ON COMMIT DROP;

DO $matchs$
DECLARE
  v_nb integer;
  v_saison_id integer;
  v_projet_id integer;
  v_debut date;
  v_fin date;
  v_seance_id integer;
  v_existants integer;
  r record;
  v_contrat_attendu_id integer;
  v_contrat_id integer;
  v_nb_contrats integer;
BEGIN
  IF (SELECT COUNT(*) FROM _matchs_import_plan) <> 29 THEN
    RAISE EXCEPTION 'Le planning doit contenir exactement 29 matchs.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (SELECT DISTINCT groupe_id FROM _matchs_import_plan) p
    LEFT JOIN public.groupes g ON g.id=p.groupe_id WHERE g.id IS NULL
  ) THEN RAISE EXCEPTION 'Groupe absent : un des IDs 28,29,30,45,46,47,48 n existe pas.'; END IF;

  SELECT COUNT(DISTINCT g.saison_id), MIN(g.saison_id)
  INTO v_nb, v_saison_id
  FROM public.groupes g
  JOIN (SELECT DISTINCT groupe_id FROM _matchs_import_plan) p ON p.groupe_id=g.id;
  IF v_nb <> 1 THEN
    RAISE EXCEPTION 'Les groupes fournis n appartiennent pas tous à la même saison (% saisons).',v_nb;
  END IF;

  SELECT s.project_id,s.date_debut,s.date_fin
  INTO v_projet_id,v_debut,v_fin FROM public.saison s WHERE s.id=v_saison_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saison % introuvable.',v_saison_id; END IF;

  IF EXISTS (SELECT 1 FROM _matchs_import_plan p WHERE p.jour NOT BETWEEN v_debut AND v_fin) THEN
    RAISE EXCEPTION 'Au moins une rencontre est en dehors de la saison % (% -> %).',v_saison_id,v_debut,v_fin;
  END IF;

  IF EXISTS (
    SELECT 1 FROM (SELECT DISTINCT lieu_id FROM _matchs_import_plan) p
    LEFT JOIN public.lieu l ON l.id=p.lieu_id
    WHERE l.id IS NULL OR l.project_id <> v_projet_id
  ) THEN
    RAISE EXCEPTION 'Un des lieux 2,5,6,7 est absent ou rattaché à un autre projet.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.assolutions_match_import i
    JOIN _matchs_import_plan p ON p.cle=i.cle
    JOIN public.seance s ON s.seance_id=i.seance_id
    WHERE s.saison_id <> v_saison_id
  ) THEN RAISE EXCEPTION 'Registre d import : une séance correspond à une autre saison.'; END IF;

  -- Les matchs sont indépendants du cours hebdomadaire : cours NULL.
  -- Leur calendrier_id reste NULL : aucune synchro Google déclenchée.
  FOR r IN SELECT * FROM _matchs_import_plan ORDER BY jour,cle LOOP
    v_seance_id := NULL;
    SELECT s.seance_id INTO v_seance_id
    FROM public.assolutions_match_import i
    JOIN public.seance s ON s.seance_id=i.seance_id
    WHERE i.cle=r.cle;

    IF v_seance_id IS NOT NULL THEN
      INSERT INTO _matchs_import_resultats VALUES (r.cle,v_seance_id,'DÉJÀ_IMPORTÉ');
      CONTINUE; -- Ne JAMAIS écraser une modification manuelle postérieure.
    END IF;

    SELECT COUNT(*),MIN(s.seance_id)
      INTO v_existants,v_seance_id
      FROM public.seance s
     WHERE s.saison_id=v_saison_id AND s.date_seance=r.jour
       AND s.label=r.libelle;
    IF v_existants > 1 THEN
      RAISE EXCEPTION 'Séances préexistantes ambiguës : % / % (% lignes).',r.jour,r.libelle,v_existants;
    END IF;
    IF v_existants = 1 THEN
      -- Un match déjà créé à la main peut être repris seulement s'il correspond
      -- au type et au lieu attendus et n'appartient pas à un autre groupe.
      IF EXISTS (
        SELECT 1 FROM public.seance s WHERE s.seance_id=v_seance_id
          AND (s.type_seance::text <> 'MATCH' OR s.lieu_id <> r.lieu_id)
      ) OR EXISTS (
        SELECT 1 FROM public.lien_groupe g
         WHERE g.object_type='séance' AND g.object_id=v_seance_id
           AND g.groupe_id<>r.groupe_id
      ) THEN
        RAISE EXCEPTION 'Rencontre existante différente : % / %. Vérification manuelle requise.',r.jour,r.libelle;
      END IF;
      INSERT INTO _matchs_import_resultats VALUES (r.cle,v_seance_id,'REPRISE_EXISTANT');
    ELSE
      INSERT INTO public.seance (
        saison_id,cours,calendrier_id,label,type_seance,date_seance,
        heure_debut,duree_seance,lieu_id,statut,
        essai_possible,convocation_nominative,afficher_present,
        appointment,info_seance,date_creation,date_maj
      ) VALUES (
        v_saison_id,NULL,NULL,r.libelle,'MATCH',r.jour,
        r.heure_debut,r.duree_minutes,r.lieu_id,'prévue',
        false,false,false,
        'RDV directement au gymnase',
        CASE WHEN r.heure_confirmee THEN
          'RDV directement au gymnase.'
        ELSE
          'Horaire à préciser — plage provisoire de 09h00 à 18h00. RDV directement au gymnase.'
        END,
        now(),now()
      ) RETURNING seance_id INTO v_seance_id;
      INSERT INTO _matchs_import_resultats VALUES (r.cle,v_seance_id,'CRÉÉ');
    END IF;

    INSERT INTO public.lien_groupe (groupe_id,object_id,object_type,date_creation,date_maj)
    SELECT r.groupe_id,v_seance_id,'séance',now(),now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lien_groupe lg
      WHERE lg.groupe_id=r.groupe_id AND lg.object_id=v_seance_id
        AND lg.object_type='séance'
    );

    -- Les listes ci-dessous contiennent des IDs de CONTRATS (contrat_prof.id),
    -- pas des IDs de professeurs (contrat_prof.professeur_id).
    -- Chris n'ayant pas d'ID fourni, Daniel seul pour U11/U15.
    FOR v_contrat_attendu_id IN
      SELECT DISTINCT unnest(CASE
          WHEN r.cle LIKE '%_RB_%' THEN ARRAY[45,41]::integer[]
          WHEN r.cle LIKE '%_RS_U11_%' OR r.cle LIKE '%_RS_U15_%' THEN ARRAY[48]::integer[]
          WHEN r.cle = 'MATCH2627_20270321_RS_N1_BRUXELLES' THEN ARRAY[48]::integer[]
          ELSE ARRAY[41,42,43]::integer[]
        END)
    LOOP
      SELECT COUNT(*), MIN(cp.id) INTO v_nb_contrats,v_contrat_id
      FROM public.contrat_prof cp
      WHERE cp.id=v_contrat_attendu_id AND cp.saison_id=v_saison_id
        AND cp.date_debut<=r.jour AND (cp.date_fin IS NULL OR cp.date_fin>=r.jour);
      IF v_nb_contrats<>1 THEN
        RAISE EXCEPTION 'Contrat professeur % : % contrats actifs pour % (attendu 1).',v_contrat_attendu_id,v_nb_contrats,r.jour;
      END IF;
      INSERT INTO public.seance_professeur
        (seance_id,minutes,cout,info,created_at,updated_at,professeurcontract_id,statut)
      SELECT v_seance_id,r.duree_minutes,NULL,'Encadrement match',now(),now(),v_contrat_id,'prévue'
      WHERE NOT EXISTS (SELECT 1 FROM public.seance_professeur sp
        WHERE sp.seance_id=v_seance_id AND sp.professeurcontract_id=v_contrat_id);
    END LOOP;

    INSERT INTO public.assolutions_match_import (cle,seance_id)
    VALUES (r.cle,v_seance_id)
    ON CONFLICT (cle) DO UPDATE
    SET seance_id=EXCLUDED.seance_id,mis_a_jour_le=now();
  END LOOP;

  IF (SELECT COUNT(*) FROM _matchs_import_resultats)<>29 THEN
    RAISE EXCEPTION 'Tous les matchs n ont pas été importés.';
  END IF;
  -- Vérification stricte de CHAQUE association séance/groupe attendue.
  -- Ne pas nommer l'alias SQL « r » : il entre en conflit avec
  -- la variable RECORD « r » de cette fonction PL/pgSQL.
  IF EXISTS (
    SELECT 1
    FROM _matchs_import_resultats AS resultat
    JOIN _matchs_import_plan AS plan ON plan.cle = resultat.cle
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.lien_groupe AS lien
      WHERE lien.object_id = resultat.seance_id
        AND lien.object_type = 'séance'
        AND lien.groupe_id = plan.groupe_id
    )
  ) THEN
    RAISE EXCEPTION 'Une séance ne possède pas son lien groupe attendu.';
  END IF;

  RAISE NOTICE 'PREPROD : projet %, saison %, 29 matchs vérifiés.',v_projet_id,v_saison_id;
END
$matchs$;

-- ============================================================================
-- BILAN : attendu lors du 1er passage : 29 CRÉÉ ; après COMMIT/réexécution :
-- 29 DÉJÀ_IMPORTÉ (les lignes existantes ne sont pas écrasées).
-- ============================================================================
SELECT action,COUNT(*) AS nombre
FROM _matchs_import_resultats GROUP BY action ORDER BY action;

SELECT p.jour,p.libelle,p.groupe_id,p.lieu_id,p.heure_debut,
       p.duree_minutes AS minutes,
       CASE WHEN p.heure_confirmee THEN 'Heure précisée' ELSE 'Horaire à préciser' END AS precision_horaire,
       r.seance_id,r.action,
       (SELECT COUNT(*) FROM public.seance_professeur sp WHERE sp.seance_id=r.seance_id) AS professeurs_lies
FROM _matchs_import_plan p
JOIN _matchs_import_resultats r ON r.cle=p.cle
ORDER BY p.jour,p.groupe_id,p.libelle;

SELECT COUNT(*) AS matchs_verifies,
       COUNT(DISTINCT p.jour) AS journees,
       COUNT(*) FILTER (WHERE r.action='CRÉÉ') AS matchs_crees,
       COUNT(*) FILTER (WHERE r.action<>'CRÉÉ') AS matchs_deja_presents,
       COUNT(*) FILTER (WHERE p.heure_confirmee=false) AS horaires_a_preciser,
       COUNT(*) FILTER (WHERE p.heure_confirmee=true) AS horaires_fixes,
       COUNT(*) FILTER (WHERE s.calendrier_id IS NOT NULL) AS calendriers_deja_associes,
       COUNT(*) FILTER (WHERE s.cours IS NOT NULL) AS cours_deja_associes
FROM _matchs_import_plan p
JOIN _matchs_import_resultats r ON r.cle=p.cle
JOIN public.seance s ON s.seance_id=r.seance_id;

-- ATTENTION : MODE ESSAI. Pour créer vraiment les matchs, remplacer par COMMIT.
ROLLBACK;
