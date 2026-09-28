-- Import FFRS 2026-2027 - US Ivry Roller
-- Source : extraction_licences_20260926120450.xlsx
-- Met à jour : Numéro de licence, Catégorie FFRS, Type licence FFRS.
-- Rapprochement volontairement strict : nom + prénom + date de naissance.
-- Les types FFRS autres que Loisir/Compétition ne sont PAS forcés dans le champ à 2 choix.
BEGIN;

CREATE TEMP TABLE tmp_ffrs_2026(
  licence text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  date_naissance date NOT NULL,
  categorie text,
  type_licence text
) ON COMMIT DROP;

-- Coller ici les VALUES produits par scripts/generate_ffrs_import.py.
-- Le générateur lit directement les colonnes :
-- Code Adhérent / Nom / Prénom / Date de naissance / Catégorie âge / Type.

-- Contrôle des définitions AddInfo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM addinfo WHERE object_id=0 AND object_type='PERSONNE' AND text='Numéro de licence') THEN
    RAISE EXCEPTION 'Définition AddInfo "Numéro de licence" introuvable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM addinfo WHERE object_id=0 AND object_type='PERSONNE' AND text='Catégorie FFRS') THEN
    RAISE EXCEPTION 'Définition AddInfo "Catégorie FFRS" introuvable : passer la migration release avant cet import';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM addinfo WHERE object_id=0 AND object_type='PERSONNE' AND text='Type licence FFRS') THEN
    RAISE EXCEPTION 'Définition AddInfo "Type licence FFRS" introuvable : passer la migration release avant cet import';
  END IF;
END $$;

CREATE TEMP TABLE tmp_ffrs_match AS
SELECT f.*, p.id AS personne_id
FROM tmp_ffrs_2026 f
JOIN personne p
 ON lower(trim(p.last_name))=lower(trim(f.nom))
AND lower(trim(p.first_name))=lower(trim(f.prenom))
AND p.date_naissance=f.date_naissance;

-- Empêche toute mise à jour si une ligne source correspond à plusieurs personnes.
DO $$
BEGIN
 IF EXISTS (
   SELECT licence FROM tmp_ffrs_match GROUP BY licence HAVING count(*) > 1
 ) THEN RAISE EXCEPTION 'Import FFRS annulé : rapprochement ambigu détecté';
 END IF;
END $$;

-- Upsert AddInfo selon le modèle historique : value_type = id de la définition.
WITH defs AS (
 SELECT id::text AS def_id, text AS label FROM addinfo
 WHERE object_id=0 AND object_type='PERSONNE'
 AND text IN ('Numéro de licence','Catégorie FFRS','Type licence FFRS')
), src AS (
 SELECT personne_id, 'Numéro de licence' label, licence val FROM tmp_ffrs_match
 UNION ALL SELECT personne_id,'Catégorie FFRS',categorie FROM tmp_ffrs_match
 UNION ALL SELECT personne_id,'Type licence FFRS',type_licence FROM tmp_ffrs_match
)
UPDATE addinfo a SET text=src.val
FROM src JOIN defs ON defs.label=src.label
WHERE src.val IS NOT NULL AND trim(src.val)<>''
AND a.object_type='PERSONNE' AND a.object_id=src.personne_id AND a.value_type=defs.def_id;

WITH defs AS (
 SELECT id::text AS def_id, text AS label, project_id FROM addinfo
 WHERE object_id=0 AND object_type='PERSONNE'
 AND text IN ('Numéro de licence','Catégorie FFRS','Type licence FFRS')
), src AS (
 SELECT personne_id, 'Numéro de licence' label, licence val FROM tmp_ffrs_match
 UNION ALL SELECT personne_id,'Catégorie FFRS',categorie FROM tmp_ffrs_match
 UNION ALL SELECT personne_id,'Type licence FFRS',type_licence FROM tmp_ffrs_match
)
INSERT INTO addinfo(object_id,object_type,value_type,text,project_id)
SELECT src.personne_id,'PERSONNE',defs.def_id,src.val,defs.project_id
FROM src JOIN defs ON defs.label=src.label
WHERE src.val IS NOT NULL AND trim(src.val)<>''
AND NOT EXISTS (
 SELECT 1 FROM addinfo a
 WHERE a.object_type='PERSONNE' AND a.object_id=src.personne_id AND a.value_type=defs.def_id
);

-- Bilan attendu avant COMMIT.
SELECT count(*) AS licences_source FROM tmp_ffrs_2026;
SELECT count(*) AS personnes_matchees FROM tmp_ffrs_match;
SELECT f.* FROM tmp_ffrs_2026 f
WHERE NOT EXISTS (SELECT 1 FROM tmp_ffrs_match m WHERE m.licence=f.licence)
ORDER BY nom,prenom;

COMMIT;
