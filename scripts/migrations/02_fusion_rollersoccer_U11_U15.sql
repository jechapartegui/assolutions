-- ============================================================================
-- ASSOLUTIONS | Fusion RollerSoccer U11 / U15
-- Source : cours 37 ; destination : cours 36 ; prof principal : contrat 44
-- Cut-off inclus pour l'historique : 2026-10-24 ; fusion des dates > 2026-10-24
-- Référence : modèle TypeORM jechapartegui/assolutions (master, 2026-10-24)
-- V2 : prise en charge de calendrier_evenement + calendrier_synchro_log
--      selon la migration Calendrier 2026-10-23 (FK ON DELETE SET NULL).
-- Rappel : ROLLBACK; d'abord si une précédente tentative a échoué.
--
-- MODE TEST (par défaut) : ROLLBACK à la FIN du fichier.
-- MODE RÉEL : remplacer UNIQUEMENT le dernier ROLLBACK par COMMIT.
-- Ne PAS lancer uniquement un sous-ensemble de lignes.
-- Faire une sauvegarde complète de la base AVANT le COMMIT réel.
--
-- Note : la table assolutions_seance_redirect conserve l'ancien ID des doublons
-- pour une future prise en charge dans l'API. Elle ne rend PAS, à elle seule,
-- les anciens liens /s/ fonctionnels.
-- ============================================================================
BEGIN;
SET LOCAL TIME ZONE 'Europe/Paris';
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(36, 37);

-- Empêche toute réponse/utilisation concurrente durant la fusion.
LOCK TABLE public.cours, public.seance, public.cours_professeur,
           public.seance_professeur, public.inscription_seance,
           public.lien_groupe, public.cra, public.cra_ligne,
           public.calendrier_evenement, public.calendrier_synchro_log,
           public.calendrier
IN SHARE ROW EXCLUSIVE MODE;

-- 1. Validation et repérage des paires de séances futures.
DO $preflight$
DECLARE v_a record; v_b record;
BEGIN
 SELECT * INTO v_a FROM public.cours WHERE id = 36;
 SELECT * INTO v_b FROM public.cours WHERE id = 37;
 IF NOT FOUND OR v_a.id IS NULL OR v_b.id IS NULL THEN
   RAISE EXCEPTION 'Cours 36 et 37 obligatoires ; fusion déjà passée ou mauvais environnement.';
 END IF;
 IF NOT (v_a.nom ~* 'Roller[[:space:]]*Soccer' AND
         v_b.nom ~* 'Roller[[:space:]]*Soccer' AND
         (v_a.nom || ' ' || v_b.nom) ~* 'U11' AND
         (v_a.nom || ' ' || v_b.nom) ~* 'U15') THEN
   RAISE EXCEPTION 'Les cours 36/37 ne semblent pas correspondre à RollerSoccer U11 et U15.';
 END IF;
 IF v_a.jour_semaine IS DISTINCT FROM v_b.jour_semaine OR
    v_a.heure IS DISTINCT FROM v_b.heure OR
    v_a.duree IS DISTINCT FROM v_b.duree OR
    v_a.lieu_id IS DISTINCT FROM v_b.lieu_id THEN
   RAISE EXCEPTION 'Cours 36/37 aux horaires, durées ou lieux différents : vérifier avant fusion.';
 END IF;
 IF v_a.appointment IS NOT NULL AND v_b.appointment IS NOT NULL
    AND v_a.appointment IS DISTINCT FROM v_b.appointment THEN
   RAISE EXCEPTION 'Valeurs appointment des cours 36/37 différentes : rapprochement impossible.';
 END IF;
 IF v_a.project_id IS DISTINCT FROM v_b.project_id OR
    v_a.saison_id IS DISTINCT FROM v_b.saison_id THEN
   RAISE EXCEPTION 'Les cours 36 et 37 ne sont pas dans le même projet et la même saison.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.contrat_prof
                WHERE id = 44 AND saison_id = v_a.saison_id) THEN
   RAISE EXCEPTION 'Le 44 doit être un identifiant de CONTRAT PROF de la saison %, vérifier son sens.', v_a.saison_id;
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.seance s
   WHERE s.cours IN (36,37) AND s.saison_id <> v_a.saison_id
 ) THEN RAISE EXCEPTION 'Incohérence saison des séances rattachées aux cours.';
 END IF;
 -- Plusieurs interventions pour un même contrat sur UNE séance = risque de paie.
 IF EXISTS (
   SELECT 1 FROM public.seance_professeur sp
   JOIN public.seance s ON s.seance_id = sp.seance_id
   WHERE s.cours IN (36,37) AND s.date_seance > DATE '2026-10-24'
   GROUP BY sp.seance_id, sp.professeurcontract_id HAVING count(*) > 1
 ) THEN RAISE EXCEPTION 'Doublons seance_professeur déjà présents sur une même séance : corriger avant fusion.';
 END IF;
 -- Si un cours possède plusieurs séances au même créneau, pairing non déterministe.
 IF EXISTS (
   SELECT 1 FROM public.seance s
   WHERE s.cours IN (36,37) AND s.date_seance > DATE '2026-10-24'
   GROUP BY s.cours, s.date_seance, s.heure_debut HAVING count(*) > 1
 ) THEN RAISE EXCEPTION 'Plusieurs séances du même cours à la même date/heure : appariement ambigu.';
 END IF;
END
$preflight$;

CREATE TEMP TABLE _fusion_paires ON COMMIT DROP AS
SELECT b.seance_id AS source_seance_id,
       a.seance_id AS cible_seance_id,
       b.date_seance, b.heure_debut
FROM public.seance b
JOIN public.seance a
  ON a.cours = 36 AND b.cours = 37
 AND a.date_seance = b.date_seance
 AND a.heure_debut = b.heure_debut
WHERE b.date_seance > DATE '2026-10-24';
CREATE UNIQUE INDEX ON _fusion_paires(source_seance_id);
CREATE UNIQUE INDEX ON _fusion_paires(cible_seance_id);

CREATE TEMP TABLE _fusion_sp_doublons ON COMMIT DROP AS
SELECT ps.id AS source_sp_id, pc.id AS cible_sp_id,
       ps.professeurcontract_id AS contrat_id,
       p.source_seance_id, p.cible_seance_id
FROM _fusion_paires p
JOIN public.seance_professeur ps ON ps.seance_id = p.source_seance_id
JOIN public.seance_professeur pc ON pc.seance_id = p.cible_seance_id
   AND pc.professeurcontract_id = ps.professeurcontract_id;
CREATE UNIQUE INDEX ON _fusion_sp_doublons(source_sp_id);
CREATE UNIQUE INDEX ON _fusion_sp_doublons(cible_sp_id);

-- Sauvegarder les identifiants des événements associés aux séances source
-- AVANT les suppressions (la FK ramènera seance_id à NULL).
CREATE TEMP TABLE _fusion_cal_evenements_source ON COMMIT DROP AS
SELECT ce.id, ce.calendrier_id, ce.seance_id, ce.google_event_id,
       ce.statut_synchro
FROM public.calendrier_evenement ce
JOIN _fusion_paires p ON p.source_seance_id = ce.seance_id;
CREATE UNIQUE INDEX ON _fusion_cal_evenements_source(id);

CREATE TEMP TABLE _fusion_cra_impactes ON COMMIT DROP AS
SELECT DISTINCT l.cra_id
FROM public.cra_ligne l
JOIN _fusion_sp_doublons d
 ON l.seance_professeur_id IN (d.source_sp_id,d.cible_sp_id);

-- Tous les groupes desservis par l'un OU l'autre cours, y compris les groupes
-- éventuellement paramétrés uniquement sur les séances.
CREATE TEMP TABLE _fusion_groupes ON COMMIT DROP AS
SELECT DISTINCT lg.groupe_id
FROM public.lien_groupe lg
WHERE (lg.object_type='cours' AND lg.object_id IN (36,37))
   OR (lg.object_type='séance' AND EXISTS (
       SELECT 1 FROM public.seance s WHERE s.seance_id=lg.object_id
       AND s.cours IN (36,37) AND s.date_seance>DATE '2026-10-24'));

DO $checks$
DECLARE x record; v_has boolean;
BEGIN
 -- Autres tables récemment ajoutées, absentes des entités TypeORM master :
 -- impossible de supprimer une séance/un cours tant que leurs références
 -- n'ont pas été traitées explicitement.
 FOR x IN
  SELECT table_schema,table_name,column_name
  FROM information_schema.columns
  WHERE table_schema='public' AND column_name IN ('cours_id','seance_id')
    AND table_name NOT IN ('cours_professeur','seance_professeur',
                           'inscription_seance','seance','calendrier_seance',
                           'calendrier_evenement','calendrier_synchro_log')
 LOOP
  IF x.column_name='cours_id' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I=37)',
                   x.table_schema,x.table_name,x.column_name) INTO v_has;
  ELSE
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I IN (SELECT source_seance_id FROM _fusion_paires))',
                   x.table_schema,x.table_name,x.column_name) INTO v_has;
  END IF;
  IF v_has THEN
    RAISE EXCEPTION 'Références complémentaires non traitées : %.%.% ; fusion annulée.',
      x.table_schema,x.table_name,x.column_name;
  END IF;
 END LOOP;
 -- Calendrier : le schéma 2026-10-23 prévoit précisément ON DELETE SET NULL,
 -- afin de conserver l'événement Google orphelin et de le supprimer ensuite.
 IF NOT EXISTS (
    SELECT 1 FROM pg_constraint fk
    WHERE fk.conrelid='public.calendrier_evenement'::regclass
      AND fk.confrelid='public.seance'::regclass
      AND fk.contype='f' AND fk.confdeltype='n'
      AND (SELECT array_agg(att.attname ORDER BY keycol.ord)
           FROM unnest(fk.conkey) WITH ORDINALITY AS keycol(attnum,ord)
           JOIN pg_attribute att ON att.attrelid=fk.conrelid AND att.attnum=keycol.attnum
          ) = ARRAY['seance_id']::name[]
 ) THEN
    RAISE EXCEPTION 'Calendrier : la FK calendrier_evenement.seance_id doit etre ON DELETE SET NULL ; migration différente.';
 END IF;
 -- Déclencheur qui marque l'événement source comme DELETE_PENDING avant la suppression.
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger t
   WHERE t.tgrelid='public.seance'::regclass
     AND t.tgname='trg_calendrier_seance_delete'
     AND t.tgenabled IN ('O','A')
 ) THEN RAISE EXCEPTION 'Trigger trg_calendrier_seance_delete absent/inactif : impossible de planifier le nettoyage Google.';
 END IF;
 -- Ne pas fusionner des séances publiées dans deux calendriers différents.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.seance a ON a.seance_id=p.cible_seance_id
   JOIN public.seance b ON b.seance_id=p.source_seance_id
   WHERE a.calendrier_id IS NOT NULL AND b.calendrier_id IS NOT NULL
     AND a.calendrier_id <> b.calendrier_id
 ) THEN RAISE EXCEPTION 'Deux calendriers differents pour une meme séance : arbitrage manuel nécessaire.';
 END IF;
 -- Les événements en cours de synchronisation ne doivent pas être déplacés.
 IF EXISTS (
   SELECT 1 FROM public.calendrier_evenement ce
   JOIN _fusion_paires p ON ce.seance_id IN (p.source_seance_id,p.cible_seance_id)
   WHERE ce.statut_synchro = 'SYNCING'
 ) THEN RAISE EXCEPTION 'Une synchronisation Google est en cours : réessayer hors synchronisation.';
 END IF;
 -- Refuser les événements actifs associés à un calendrier qui n'est plus celui de la séance.
 IF EXISTS (
   SELECT 1 FROM public.calendrier_evenement ce
   JOIN public.seance s ON s.seance_id=ce.seance_id
   JOIN _fusion_paires p ON s.seance_id IN (p.source_seance_id,p.cible_seance_id)
   WHERE ce.statut_synchro NOT IN ('DELETE_PENDING','DELETED')
     AND ce.calendrier_id IS DISTINCT FROM s.calendrier_id
 ) THEN RAISE EXCEPTION 'Evenement Google actif sur calendrier different de la seance : examen nécessaire.';
 END IF;
 -- Événement cible en cours de suppression : pas de réactivation implicite.
 IF EXISTS (
   SELECT 1 FROM public.calendrier_evenement ce
   JOIN _fusion_paires p ON ce.seance_id=p.cible_seance_id
   JOIN public.seance a ON a.seance_id=p.cible_seance_id
   WHERE ce.calendrier_id=COALESCE(a.calendrier_id,
         (SELECT b.calendrier_id FROM public.seance b WHERE b.seance_id=p.source_seance_id))
     AND ce.statut_synchro IN ('DELETE_PENDING','DELETED')
 ) THEN RAISE EXCEPTION 'Evenement Google de la séance cible déjà en cours de suppression : examiner.';
 END IF;
 -- Vérification de la saison des groupes (éviter toute fuite entre saisons).
 IF EXISTS(
   SELECT 1 FROM _fusion_groupes fg JOIN public.groupes g ON g.id=fg.groupe_id
   JOIN public.cours c ON c.id=36 WHERE g.saison_id <> c.saison_id
 ) THEN RAISE EXCEPTION 'Un groupe est rattaché à une autre saison.';
 END IF;
 -- N'assembler QUE des séances réellement simultanées et compatibles.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.seance a ON a.seance_id = p.cible_seance_id
   JOIN public.seance b ON b.seance_id = p.source_seance_id
   WHERE a.saison_id IS DISTINCT FROM b.saison_id
      OR a.lieu_id IS DISTINCT FROM b.lieu_id
      OR a.duree_seance IS DISTINCT FROM b.duree_seance
      OR a.type_seance IS DISTINCT FROM b.type_seance
      OR a.statut IS DISTINCT FROM b.statut
 ) THEN
   RAISE EXCEPTION 'Séances jumelles incompatibles (lieu, durée, type ou statut) : fusion annulée.';
 END IF;
 -- L'appointment peut être un identifiant externe ; ne jamais l'écraser.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.seance a ON a.seance_id = p.cible_seance_id
   JOIN public.seance b ON b.seance_id = p.source_seance_id
   WHERE a.appointment IS NOT NULL AND b.appointment IS NOT NULL
     AND a.appointment IS DISTINCT FROM b.appointment
 ) THEN
   RAISE EXCEPTION 'Deux appointments différents sur une paire de séances : analyse nécessaire.';
 END IF;
 -- Une présence réelle contradictoire ne peut pas être tranchée automatiquement.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.inscription_seance a ON a.seance_id=p.cible_seance_id
   JOIN public.inscription_seance b ON b.seance_id=p.source_seance_id
    AND b.personne_id=a.personne_id
   WHERE a.statut_seance IS NOT NULL AND b.statut_seance IS NOT NULL
     AND a.statut_seance IS DISTINCT FROM b.statut_seance
 ) THEN
   RAISE EXCEPTION 'Présences RÉELLES contradictoires : consulter le diagnostic, arbitrage manuel obligatoire.';
 END IF;
 -- Réponses « oui/non » contradictoires au même instant : aucun dernier choix fiable.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.inscription_seance a ON a.seance_id=p.cible_seance_id
   JOIN public.inscription_seance b ON b.seance_id=p.source_seance_id
    AND b.personne_id=a.personne_id
   WHERE a.statut_inscription IS NOT NULL AND b.statut_inscription IS NOT NULL
     AND a.statut_inscription IS DISTINCT FROM b.statut_inscription
     AND a.date_inscription IS NOT DISTINCT FROM b.date_inscription
 ) THEN
   RAISE EXCEPTION 'Réponses contradictoires avec horodatages égaux : arbitrage manuel obligatoire.';
 END IF;
 -- Interventions jumelles : ni doubler la durée ni écraser deux taux différents.
 IF EXISTS (
   SELECT 1 FROM _fusion_sp_doublons d
   JOIN public.seance_professeur a ON a.id=d.cible_sp_id
   JOIN public.seance_professeur b ON b.id=d.source_sp_id
   WHERE a.minutes IS DISTINCT FROM b.minutes
      OR a.statut IS DISTINCT FROM b.statut
      OR (a.cout IS NOT NULL AND b.cout IS NOT NULL
          AND a.cout IS DISTINCT FROM b.cout)
 ) THEN
   RAISE EXCEPTION 'Deux interventions prof ont des minutes, statuts ou coûts différents : arbitrage nécessaire.';
 END IF;
 -- Aucune ligne CRA non-brouillon associée aux futures séances fusionnées.
 IF EXISTS (
   SELECT 1 FROM _fusion_paires p
   JOIN public.seance_professeur sp
     ON sp.seance_id IN (p.source_seance_id, p.cible_seance_id)
   JOIN public.cra_ligne l ON l.seance_professeur_id = sp.id
   JOIN public.cra c ON c.id = l.cra_id
   WHERE c.statut <> 'BROUILLON'
 ) THEN
   RAISE EXCEPTION 'CRA SOUMIS/VALIDÉ/FACTURÉ sur les séances fusionnées : arrêt pour ne pas toucher à la comptabilité.';
 END IF;
 -- Toute ligne financière de la paire doit correspondre au contrat concerné.
 IF EXISTS (
   SELECT 1 FROM _fusion_sp_doublons d
   JOIN public.cra_ligne l ON l.seance_professeur_id IN (d.source_sp_id,d.cible_sp_id)
   JOIN public.cra c ON c.id=l.cra_id
   WHERE c.contrat_prof_id <> d.contrat_id
 ) THEN RAISE EXCEPTION 'Ligne CRA rattachée à un contrat différent de la séance professeur.';
 END IF;
 -- Deux lignes de CRA doublonnées doivent être *rigoureusement* identiques.
 IF EXISTS (
   SELECT 1 FROM _fusion_sp_doublons d
   JOIN public.cra_ligne la ON la.seance_professeur_id=d.cible_sp_id
   JOIN public.cra_ligne lb ON lb.seance_professeur_id=d.source_sp_id
   WHERE la.cra_id IS DISTINCT FROM lb.cra_id
      OR la.montant IS DISTINCT FROM lb.montant
      OR la.quantite IS DISTINCT FROM lb.quantite
      OR la.taux IS DISTINCT FROM lb.taux
      OR la.type IS DISTINCT FROM lb.type
      OR la.date IS DISTINCT FROM lb.date
 ) THEN
   RAISE EXCEPTION 'Lignes de CRA jumelles avec montants / CRA différents : arbitrage avant fusion.';
 END IF;
END
$checks$;

-- 2. Copie des données avant modification (persistante après COMMIT).
CREATE TABLE IF NOT EXISTS public.assolutions_fusion_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation text NOT NULL,
  table_name text NOT NULL,
  row_key text NOT NULL,
  row_before jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_assolutions_fusion_audit UNIQUE(operation,table_name,row_key)
);

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','cours', c.id::text, to_jsonb(c)
FROM public.cours c WHERE c.id IN (36,37) ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','seance', s.seance_id::text,to_jsonb(s)
FROM public.seance s WHERE s.cours IN (36,37) ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','cours_professeur', x.id::text,to_jsonb(x)
FROM public.cours_professeur x WHERE x.cours_id IN (36,37) ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','inscription_seance',
       x.personne_id::text||':'||x.seance_id::text,to_jsonb(x)
FROM public.inscription_seance x
WHERE x.seance_id IN
 (SELECT source_seance_id FROM _fusion_paires UNION SELECT cible_seance_id FROM _fusion_paires)
ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','seance_professeur', x.id::text,to_jsonb(x)
FROM public.seance_professeur x
WHERE x.seance_id IN
 (SELECT source_seance_id FROM _fusion_paires UNION SELECT cible_seance_id FROM _fusion_paires)
ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','cra_ligne', x.id::text,to_jsonb(x)
FROM public.cra_ligne x WHERE x.cra_id IN (SELECT cra_id FROM _fusion_cra_impactes)
ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','cra', x.id::text,to_jsonb(x)
FROM public.cra x WHERE x.id IN (SELECT cra_id FROM _fusion_cra_impactes)
ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','lien_groupe', x.id::text,to_jsonb(x)
FROM public.lien_groupe x
WHERE (x.object_type='cours' AND x.object_id IN (36,37))
 OR (x.object_type='séance' AND x.object_id IN (
     SELECT s.seance_id FROM public.seance s
     WHERE s.cours IN (36,37) AND s.date_seance > DATE '2026-10-24'))
ON CONFLICT DO NOTHING;

-- Sauvegardes calendrier : indispensable pour diagnostiquer ou annuler
-- une désynchronisation Google. Le journal historique n'est PAS modifié.
INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','calendrier_evenement',ce.id::text,to_jsonb(ce)
FROM public.calendrier_evenement ce
JOIN _fusion_paires p ON ce.seance_id IN (p.source_seance_id,p.cible_seance_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.assolutions_fusion_audit(operation,table_name,row_key,row_before)
SELECT 'ROLLER_36_37_20261024','calendrier_synchro_log',l.id::text,to_jsonb(l)
FROM public.calendrier_synchro_log l
JOIN _fusion_paires p ON l.seance_id IN (p.source_seance_id,p.cible_seance_id)
ON CONFLICT DO NOTHING;

-- 3. Identifiants de redirection : NE fonctionnent qu'après patch côté API.
CREATE TABLE IF NOT EXISTS public.assolutions_seance_redirect (
  ancien_seance_id int PRIMARY KEY,
  nouveau_seance_id int NOT NULL REFERENCES public.seance(seance_id),
  motif text NOT NULL DEFAULT 'Fusion RollerSoccer U11/U15',
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.assolutions_seance_redirect (ancien_seance_id,nouveau_seance_id)
SELECT source_seance_id,cible_seance_id FROM _fusion_paires
ON CONFLICT (ancien_seance_id) DO UPDATE
SET nouveau_seance_id = EXCLUDED.nouveau_seance_id;

-- 4. Cours / professeurs / groupes.
UPDATE public.cours a
SET nom='RollerSoccer U11/U15', prof_principal_id=44,
    age_minimum=CASE WHEN a.age_minimum IS NULL OR b.age_minimum IS NULL
                      THEN NULL ELSE LEAST(a.age_minimum,b.age_minimum) END,
    age_maximum=CASE WHEN a.age_maximum IS NULL OR b.age_maximum IS NULL
                      THEN NULL ELSE GREATEST(a.age_maximum,b.age_maximum) END,
    place_maximum=CASE WHEN a.place_maximum IS NULL OR b.place_maximum IS NULL
                       THEN NULL ELSE GREATEST(a.place_maximum,b.place_maximum) END,
    convocation_nominative=(a.convocation_nominative AND b.convocation_nominative),
    afficher_present=(a.afficher_present OR b.afficher_present),
    essai_possible=(a.essai_possible OR b.essai_possible),
    appointment=COALESCE(a.appointment,b.appointment),
    date_maj=now()
FROM public.cours b WHERE a.id=36 AND b.id=37;

DELETE FROM public.cours_professeur cp
USING public.cours_professeur dest
WHERE cp.cours_id=37 AND dest.cours_id=36 AND cp.contrat_id=dest.contrat_id;
UPDATE public.cours_professeur SET cours_id=36, date_maj=now() WHERE cours_id=37;
INSERT INTO public.cours_professeur(cours_id,contrat_id)
SELECT 36,44 WHERE NOT EXISTS
 (SELECT 1 FROM public.cours_professeur WHERE cours_id=36 AND contrat_id=44);

DELETE FROM public.lien_groupe g
USING public.lien_groupe a
WHERE g.object_type='cours' AND g.object_id=37
  AND a.object_type='cours' AND a.object_id=36 AND g.groupe_id=a.groupe_id;
UPDATE public.lien_groupe SET object_id=36,date_maj=now()
WHERE object_type='cours' AND object_id=37;
-- Si des groupes n'étaient associés qu'aux séances, les rattacher au cours.
INSERT INTO public.lien_groupe(groupe_id,object_id,object_type)
SELECT fg.groupe_id,36,'cours' FROM _fusion_groupes fg
WHERE NOT EXISTS (
 SELECT 1 FROM public.lien_groupe lg
 WHERE lg.object_type='cours' AND lg.object_id=36 AND lg.groupe_id=fg.groupe_id);

-- 5. Présences : insertion + gestion des collisions de personnes.
-- Une valeur non nulle est conservée ; si deux RSVP s'opposent,
-- le dernier horodatage l'emporte. Les présences réelles contradictoires
-- sont bloquées par le préflight.
INSERT INTO public.inscription_seance
  (personne_id,seance_id,date_inscription,statut_inscription,statut_seance)
SELECT i.personne_id,p.cible_seance_id,
       COALESCE(i.date_inscription, now()), i.statut_inscription,i.statut_seance
FROM public.inscription_seance i
JOIN _fusion_paires p ON p.source_seance_id=i.seance_id
ON CONFLICT (personne_id,seance_id) DO UPDATE
SET statut_inscription =
  CASE
   WHEN EXCLUDED.statut_inscription IS NULL THEN inscription_seance.statut_inscription
   WHEN inscription_seance.statut_inscription IS NULL THEN EXCLUDED.statut_inscription
   WHEN inscription_seance.statut_inscription=EXCLUDED.statut_inscription THEN inscription_seance.statut_inscription
   WHEN EXCLUDED.date_inscription > inscription_seance.date_inscription THEN EXCLUDED.statut_inscription
   ELSE inscription_seance.statut_inscription
  END,
 statut_seance=COALESCE(inscription_seance.statut_seance,EXCLUDED.statut_seance),
 date_inscription=GREATEST(inscription_seance.date_inscription,EXCLUDED.date_inscription);

DELETE FROM public.inscription_seance i
USING _fusion_paires p WHERE i.seance_id=p.source_seance_id;

-- 6. Groupe sur chaque séance fusionnée (copie sans doublon).
INSERT INTO public.lien_groupe(groupe_id,object_id,object_type)
SELECT DISTINCT g.groupe_id,p.cible_seance_id,'séance'
FROM public.lien_groupe g
JOIN _fusion_paires p ON g.object_type='séance' AND g.object_id=p.source_seance_id
WHERE NOT EXISTS (
 SELECT 1 FROM public.lien_groupe x
 WHERE x.object_type='séance' AND x.object_id=p.cible_seance_id
 AND x.groupe_id=g.groupe_id);
DELETE FROM public.lien_groupe g
USING _fusion_paires p
WHERE g.object_type='séance' AND g.object_id=p.source_seance_id;

-- 7. Interventions de prof : conserver UNE ligne par contrat et par séance.
-- Les lignes CRA de brouillon strictement doublonnées sont supprimées.
DELETE FROM public.cra_ligne l
USING _fusion_sp_doublons d
WHERE l.seance_professeur_id=d.source_sp_id
  AND EXISTS (SELECT 1 FROM public.cra_ligne x
              WHERE x.seance_professeur_id=d.cible_sp_id AND x.cra_id=l.cra_id);

UPDATE public.cra_ligne l
SET seance_professeur_id=d.cible_sp_id
FROM _fusion_sp_doublons d WHERE l.seance_professeur_id=d.source_sp_id;

UPDATE public.seance_professeur dst
SET cout=COALESCE(dst.cout, src.cout),
    info=COALESCE(NULLIF(dst.info,''),src.info),
    updated_at=now()
FROM _fusion_sp_doublons d, public.seance_professeur src
WHERE dst.id=d.cible_sp_id AND src.id=d.source_sp_id;

DELETE FROM public.seance_professeur sp
USING _fusion_sp_doublons d WHERE sp.id=d.source_sp_id;

-- Professeurs qui n'étaient que sur la séance 37 : rattacher sans recréer l'ID.
UPDATE public.seance_professeur sp
SET seance_id=p.cible_seance_id, updated_at=now()
FROM _fusion_paires p WHERE sp.seance_id=p.source_seance_id;

-- Recalcul des CRA impactés (uniquement brouillons, contrôlé plus haut).
UPDATE public.cra c SET montant_total=COALESCE(
 (SELECT SUM(l.montant) FROM public.cra_ligne l WHERE l.cra_id=c.id),0),
 updated_at=now()
WHERE c.id IN (SELECT cra_id FROM _fusion_cra_impactes);

-- 8. Fusion des caractéristiques des séances simultanées.
-- Si une seule des deux séances était reliée à un calendrier, le conserver.
-- Si les deux sont sur des calendriers différents, un contrôle a déjà bloqué.
UPDATE public.seance a SET
 calendrier_id=COALESCE(a.calendrier_id,b.calendrier_id),
 label='RollerSoccer U11/U15',
 age_minimum=CASE WHEN a.age_minimum IS NULL OR b.age_minimum IS NULL
   THEN NULL ELSE LEAST(a.age_minimum,b.age_minimum) END,
 age_maximum=CASE WHEN a.age_maximum IS NULL OR b.age_maximum IS NULL
   THEN NULL ELSE GREATEST(a.age_maximum,b.age_maximum) END,
 est_limite_age_minimum=(a.age_minimum IS NOT NULL AND b.age_minimum IS NOT NULL),
 est_limite_age_maximum=(a.age_maximum IS NOT NULL AND b.age_maximum IS NOT NULL),
 place_maximum=CASE WHEN a.place_maximum IS NULL OR b.place_maximum IS NULL
   THEN NULL ELSE GREATEST(a.place_maximum,b.place_maximum) END,
 est_place_maximum=(a.place_maximum IS NOT NULL AND b.place_maximum IS NOT NULL),
 convocation_nominative=(a.convocation_nominative AND b.convocation_nominative),
 afficher_present=(a.afficher_present OR b.afficher_present),
 essai_possible=(a.essai_possible OR b.essai_possible),
 nb_essai_possible=CASE WHEN a.nb_essai_possible IS NULL OR b.nb_essai_possible IS NULL
   THEN NULL ELSE GREATEST(a.nb_essai_possible,b.nb_essai_possible) END,
 info_seance=CASE
    WHEN a.info_seance IS NULL OR btrim(a.info_seance)='' THEN b.info_seance
    WHEN b.info_seance IS NULL OR btrim(b.info_seance)='' THEN a.info_seance
    WHEN a.info_seance=b.info_seance THEN a.info_seance
    ELSE concat(a.info_seance,E'\n--- Informations complémentaires ---\n',b.info_seance)
  END,
 appointment=COALESCE(a.appointment,b.appointment),
 date_maj=now()
FROM _fusion_paires p JOIN public.seance b ON b.seance_id=p.source_seance_id
WHERE a.seance_id=p.cible_seance_id;

-- 9. Prise en charge du calendrier (migration 2026-10-23).
-- Les événements Google de la séance 37 restent stockés, avec leur google_event_id.
-- Le trigger BEFORE DELETE de seance les passe à DELETE_PENDING ; la FK
-- ON DELETE SET NULL les détache de leur ancienne séance. Aucun appel à Google ici.
-- Si la séance 36 n'avait pas encore d'événement dans son calendrier,
-- demander sa création sans réutiliser l'ancien google_event_id de la 37.
INSERT INTO public.calendrier_evenement
 (calendrier_id,seance_id,statut_synchro)
SELECT a.calendrier_id, a.seance_id, 'PENDING'
FROM _fusion_paires p
JOIN public.seance a ON a.seance_id=p.cible_seance_id
WHERE a.calendrier_id IS NOT NULL
  AND NOT EXISTS (
     SELECT 1 FROM public.calendrier_evenement ce
     WHERE ce.calendrier_id=a.calendrier_id AND ce.seance_id=a.seance_id
  );

-- Les tables de journalisation calendrier_synchro_log sont conservées
-- à l'identique : leur seance_id correspond à l'identifiant au moment du log.
-- C'est de l'historique, pas une relation FK active.
-- Si un ancien module calendrier_seance coexiste, maintenir le verrou de sécurité.
DO $calendrier$
DECLARE nb bigint;
BEGIN
 IF to_regclass('public.calendrier_seance') IS NOT NULL THEN
   IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='calendrier_seance'
                AND column_name='seance_id') THEN
     EXECUTE 'SELECT COUNT(*) FROM public.calendrier_seance x JOIN _fusion_paires p ON x.seance_id=p.source_seance_id'
       INTO nb;
     IF nb>0 THEN
       RAISE EXCEPTION 'Ancien module calendrier_seance : % liens vers séances à supprimer. Examen nécessaire.',nb;
     END IF;
   END IF;
 END IF;
END
$calendrier$;

-- 10. Supprimer les séances doublons U15 maintenant déliées.
-- Toute FK non prévue interrompt et annule intégralement la transaction.
DELETE FROM public.seance s
USING _fusion_paires p WHERE s.seance_id=p.source_seance_id;

-- Normaliser le nettoyage des événements Google source.
-- Sans identifiant Google, rien à supprimer chez Google : DELETED.
-- Avec identifiant Google, le moteur de synchro doit le supprimer : DELETE_PENDING.
UPDATE public.calendrier_evenement ce
SET statut_synchro=CASE WHEN ce.google_event_id IS NULL THEN 'DELETED'
                       ELSE 'DELETE_PENDING' END,
    date_maj=now()
FROM _fusion_cal_evenements_source src
WHERE ce.id=src.id AND ce.seance_id IS NULL
  AND ce.statut_synchro <> 'DELETED';

-- Signaler aux calendriers actifs qu'un événement doit être resynchronisé.
UPDATE public.calendrier c
SET statut_synchro='PENDING',date_maj=now()
WHERE c.id IN (
  SELECT calendrier_id FROM _fusion_cal_evenements_source
  UNION
  SELECT a.calendrier_id FROM _fusion_paires p
  JOIN public.seance a ON a.seance_id=p.cible_seance_id
)
AND c.statut_synchro NOT IN ('DISABLED','LOCAL_ONLY');

-- 11. Tous les enregistrements de séance encore rattachés au 37 (passés
-- compris) pointent vers 36 : leur ID et données historiques restent intacts.
-- C'est indispensable pour pouvoir retirer le COURS 37 de l'application.
UPDATE public.seance SET cours=36, date_maj=now() WHERE cours=37;

-- Unifier la plage d'âge sur les séances FUTURES des deux catégories.
-- Les statuts, lieux et durées des séances non appariées restent intacts.
UPDATE public.seance s SET
 age_minimum=c.age_minimum,
 age_maximum=c.age_maximum,
 est_limite_age_minimum=(c.age_minimum IS NOT NULL),
 est_limite_age_maximum=(c.age_maximum IS NOT NULL),
 convocation_nominative=c.convocation_nominative,
 afficher_present=(s.afficher_present OR c.afficher_present),
 date_maj=now()
FROM public.cours c
WHERE c.id=36 AND s.cours=36 AND s.date_seance>DATE '2026-10-24';

-- Unifier le libellé FUTUR, sans toucher aux intitulés historiques passés.
UPDATE public.seance s SET label='RollerSoccer U11/U15',date_maj=now()
WHERE s.cours=36 AND s.date_seance>DATE '2026-10-24'
 AND s.label IS DISTINCT FROM 'RollerSoccer U11/U15';

-- Inscrire les deux groupes sur toutes les futures séances du cours fusionné,
-- y compris celles qui n'existaient auparavant que côté U11 ou U15.
INSERT INTO public.lien_groupe(groupe_id,object_id,object_type)
SELECT DISTINCT fg.groupe_id, s.seance_id,'séance'
FROM _fusion_groupes fg
JOIN public.seance s ON s.cours=36 AND s.date_seance>DATE '2026-10-24'
WHERE NOT EXISTS (
   SELECT 1 FROM public.lien_groupe old
   WHERE old.object_type='séance' AND old.object_id=s.seance_id
     AND old.groupe_id=fg.groupe_id
 );

-- Supprimer enfin le cours source (si une nouvelle référence non prévue existe,
-- PostgreSQL échoue et annule tout ; aucune suppression partielle possible).
DELETE FROM public.cours WHERE id=37;

-- 12. Contrôles finaux.
DO $final$
BEGIN
 IF EXISTS (SELECT 1 FROM public.seance WHERE cours=37) OR
    EXISTS (SELECT 1 FROM public.cours WHERE id=37) OR
    EXISTS (SELECT 1 FROM public.cours_professeur WHERE cours_id=37) OR
    EXISTS (SELECT 1 FROM public.lien_groupe WHERE object_type='cours' AND object_id=37)
 THEN RAISE EXCEPTION 'Référence résiduelle au cours 37.';
 END IF;
 IF EXISTS (SELECT 1 FROM _fusion_paires p JOIN public.seance s ON s.seance_id=p.source_seance_id)
 THEN RAISE EXCEPTION 'Une séance source n''a pas été supprimée.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM _fusion_cal_evenements_source src
   JOIN public.calendrier_evenement ce ON ce.id=src.id
   WHERE ce.seance_id IS NOT NULL
      OR (ce.google_event_id IS NOT NULL
          AND ce.statut_synchro NOT IN ('DELETE_PENDING','DELETED'))
 ) THEN RAISE EXCEPTION 'Evenement Google source non détaché ou suppression non programmée.';
 END IF;
 IF EXISTS (
    SELECT 1 FROM public.seance_professeur sp
    JOIN public.seance s ON s.seance_id=sp.seance_id
    WHERE s.cours=36 AND s.date_seance>DATE '2026-10-24'
    GROUP BY sp.seance_id,sp.professeurcontract_id HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Doublon de rémunération professeur après fusion.';
 END IF;
END
$final$;

SELECT 'RÉCAPITULATIF AVANT ROLLBACK/COMMIT' AS bilan,
       (SELECT count(*) FROM _fusion_paires) AS seances_doublons_supprimees,
       (SELECT count(*) FROM _fusion_sp_doublons) AS interventions_prof_dedoublees,
       (SELECT count(*) FROM _fusion_cra_impactes) AS cra_brouillons_controles,
       (SELECT count(*) FROM _fusion_cal_evenements_source) AS evenements_google_sources_conserves,
       (SELECT count(*) FROM public.calendrier_evenement ce
        JOIN _fusion_cal_evenements_source src ON src.id=ce.id
        WHERE ce.seance_id IS NULL AND ce.statut_synchro='DELETE_PENDING') AS suppressions_google_a_traiter,
       (SELECT count(*) FROM public.seance WHERE cours=36 AND date_seance>DATE '2026-10-24') AS seances_futures_restantes,
       (SELECT count(*) FROM public.cours_professeur WHERE cours_id=36) AS contrats_prof_retenus,
       (SELECT count(*) FROM public.assolutions_seance_redirect WHERE ancien_seance_id IN
          (SELECT source_seance_id FROM _fusion_paires)) AS redirections_enregistrees;

-- PAR DÉFAUT : exercice à blanc, aucun changement permanent.
-- Remplacer par COMMIT uniquement après avoir vérifié les contrôles ci-dessus.
COMMIT;
