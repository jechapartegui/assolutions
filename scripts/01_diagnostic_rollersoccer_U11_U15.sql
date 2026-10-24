-- ASSOLUTIONS - Diagnostic lecture seule avant la fusion U11 / U15
-- Exécutable directement sur PRÉPROD ou PROD, aucun changement.
-- Toutes les paires sont calculées à date + heure identiques > 2026-10-24.

-- 1) Configuration des cours.
SELECT id,project_id,saison_id,nom,jour_semaine,heure,duree,
       prof_principal_id,lieu_id,age_minimum,age_maximum,place_maximum,
       convocation_nominative,essai_possible
FROM public.cours WHERE id IN (36,37) ORDER BY id;

-- 2) Contrats prof associés, y compris si une des deux associations manque.
SELECT cp.cours_id, cp.contrat_id, co.professeur_id,co.type_contrat,
       co.type_remuneration,co.saison_id
FROM public.cours_professeur cp
LEFT JOIN public.contrat_prof co ON co.id=cp.contrat_id
WHERE cp.cours_id IN (36,37)
ORDER BY cp.cours_id,cp.contrat_id;

-- 3) Toutes les séances futures côte à côte : les trous restent visibles.
WITH a AS (
 SELECT * FROM public.seance WHERE cours=36 AND date_seance>DATE '2026-10-24'
), b AS (
 SELECT * FROM public.seance WHERE cours=37 AND date_seance>DATE '2026-10-24'
)
SELECT COALESCE(a.date_seance,b.date_seance) AS date_seance,
       COALESCE(a.heure_debut,b.heure_debut) AS heure_debut,
       a.seance_id AS id_36, b.seance_id AS id_37,
       CASE WHEN a.seance_id IS NOT NULL AND b.seance_id IS NOT NULL
            THEN 'FUSION' ELSE 'SÉANCE UNIQUE À CONSERVER' END AS action,
       a.statut AS statut_36, b.statut AS statut_37,
       a.lieu_id AS lieu_36,b.lieu_id AS lieu_37,
       a.duree_seance AS duree_36,b.duree_seance AS duree_37,
       a.age_minimum AS age_min_36,b.age_minimum AS age_min_37,
       a.age_maximum AS age_max_36,b.age_maximum AS age_max_37
FROM a FULL JOIN b
 ON a.date_seance=b.date_seance AND a.heure_debut=b.heure_debut
ORDER BY date_seance,heure_debut;

-- 4) Volume des inscriptions et interventions pour chaque paire.
WITH p AS (
 SELECT a.seance_id AS cible_id,b.seance_id AS source_id,a.date_seance
 FROM public.seance a JOIN public.seance b
 ON a.date_seance=b.date_seance AND a.heure_debut=b.heure_debut
 WHERE a.cours=36 AND b.cours=37 AND a.date_seance>DATE '2026-10-24'
)
SELECT p.date_seance,p.cible_id,p.source_id,
 (SELECT count(*) FROM public.inscription_seance i WHERE i.seance_id=p.cible_id) AS inscriptions_36,
 (SELECT count(*) FROM public.inscription_seance i WHERE i.seance_id=p.source_id) AS inscriptions_37,
 (SELECT count(*) FROM public.inscription_seance i JOIN public.inscription_seance j
    ON i.personne_id=j.personne_id WHERE i.seance_id=p.cible_id AND j.seance_id=p.source_id) AS personnes_en_commun,
 (SELECT count(*) FROM public.seance_professeur sp WHERE sp.seance_id=p.cible_id) AS profs_36,
 (SELECT count(*) FROM public.seance_professeur sp WHERE sp.seance_id=p.source_id) AS profs_37
FROM p ORDER BY p.date_seance;

-- 5) Conflits potentiels de déclarations, individuellement, avec horodatage.
WITH p AS (
 SELECT a.seance_id AS cible_id,b.seance_id AS source_id,a.date_seance
 FROM public.seance a JOIN public.seance b
 ON a.date_seance=b.date_seance AND a.heure_debut=b.heure_debut
 WHERE a.cours=36 AND b.cours=37 AND a.date_seance>DATE '2026-10-24'
)
SELECT p.date_seance, p.cible_id,p.source_id,a.personne_id,
 a.statut_inscription AS reponse_36,b.statut_inscription AS reponse_37,
 a.statut_seance AS presence_reelle_36,b.statut_seance AS presence_reelle_37,
 a.date_inscription AS maj_36,b.date_inscription AS maj_37,
 CASE
  WHEN a.statut_seance IS NOT NULL AND b.statut_seance IS NOT NULL
       AND a.statut_seance IS DISTINCT FROM b.statut_seance
    THEN 'BLOQUANT - présences réelles contradictoires'
  WHEN a.statut_inscription IS NOT NULL AND b.statut_inscription IS NOT NULL
       AND a.statut_inscription IS DISTINCT FROM b.statut_inscription
       AND a.date_inscription IS NOT DISTINCT FROM b.date_inscription
    THEN 'BLOQUANT - même horodatage'
  WHEN a.statut_inscription IS NOT NULL AND b.statut_inscription IS NOT NULL
       AND a.statut_inscription IS DISTINCT FROM b.statut_inscription
    THEN 'DERNIER VOTE CONSERVÉ'
  ELSE 'COMPLÉMENTAIRE'
 END AS resolution
FROM p
JOIN public.inscription_seance a ON a.seance_id=p.cible_id
JOIN public.inscription_seance b ON b.seance_id=p.source_id
 AND b.personne_id=a.personne_id
ORDER BY p.date_seance,a.personne_id;

-- 6) Interventions professeurs à comparer en cas de duplication.
WITH p AS (
 SELECT a.seance_id AS cible_id,b.seance_id AS source_id,a.date_seance
 FROM public.seance a JOIN public.seance b
 ON a.date_seance=b.date_seance AND a.heure_debut=b.heure_debut
 WHERE a.cours=36 AND b.cours=37 AND a.date_seance>DATE '2026-10-24'
)
SELECT p.date_seance,ps.professeurcontract_id,
 pc.id AS seance_prof_36,ps.id AS seance_prof_37,
 pc.minutes AS minutes_36,ps.minutes AS minutes_37,
 pc.cout AS cout_36,ps.cout AS cout_37,
 pc.statut AS statut_36,ps.statut AS statut_37
FROM p JOIN public.seance_professeur ps ON ps.seance_id=p.source_id
LEFT JOIN public.seance_professeur pc ON pc.seance_id=p.cible_id
 AND pc.professeurcontract_id=ps.professeurcontract_id
ORDER BY p.date_seance,ps.professeurcontract_id;

-- 7) Ligne(s) CRA déjà rattachée(s) aux futures séances des deux cours.
SELECT s.date_seance,s.cours,s.seance_id,sp.professeurcontract_id,
       sp.id AS seance_professeur_id,l.id AS ligne_cra_id,l.montant,l.quantite,l.taux,
       c.id AS cra_id,c.annee,c.mois,c.statut AS statut_cra,
       c.montant_total
FROM public.seance s
JOIN public.seance_professeur sp ON sp.seance_id=s.seance_id
JOIN public.cra_ligne l ON l.seance_professeur_id=sp.id
JOIN public.cra c ON c.id=l.cra_id
WHERE s.cours IN (36,37) AND s.date_seance>DATE '2026-10-24'
ORDER BY s.date_seance,s.cours,sp.professeurcontract_id;

-- 8) Liens de groupes présents au cours ou sur les séances.
SELECT lg.object_type,lg.object_id,lg.groupe_id,g.nom AS nom_groupe,g.saison_id
FROM public.lien_groupe lg
LEFT JOIN public.groupes g ON g.id=lg.groupe_id
WHERE (lg.object_type='cours' AND lg.object_id IN (36,37))
 OR (lg.object_type='séance' AND EXISTS
     (SELECT 1 FROM public.seance s WHERE s.seance_id=lg.object_id
      AND s.cours IN (36,37) AND s.date_seance>DATE '2026-10-24'))
ORDER BY lg.object_type,lg.object_id,lg.groupe_id;

-- 9) Liste des autres tables susceptibles de référencer ces IDs.
SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND column_name IN ('cours_id','seance_id')
ORDER BY table_name,column_name;
