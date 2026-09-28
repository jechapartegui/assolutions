#!/usr/bin/env python3
"""Génère un SQL idempotent d'import de l'extraction licences FFRS.

Usage:
  py database/tools/generate_ffrs_import.py extraction_licences.xlsx > database/generated/import_ffrs_2026_2027.sql

Ce générateur ne se connecte à aucune base. Il produit uniquement le SQL FFRS
(numéro de licence, catégorie, type Loisir/Compétition). Les représentants légaux
sont importés séparément dans la table representant_legal.

Le rapprochement se fait sur nom + prénom + date de naissance. Les lignes ambiguës
ne sont jamais appliquées : elles sont remontées à la fin du script SQL.
"""
from __future__ import annotations
import sys
from datetime import date, datetime
import re
from openpyxl import load_workbook

if len(sys.argv) != 2:
    raise SystemExit("Usage: generate_ffrs_import.py <extraction_licences.xlsx>")

wb = load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb.active
rows = ws.iter_rows(values_only=True)
headers = [str(x or "").strip() for x in next(rows)]
idx = {h: i for i, h in enumerate(headers)}

required = ["Code Adhérent","Nom","Prénom","Date de naissance","Type","Catégorie âge"]
missing=[x for x in required if x not in idx]
if missing: raise SystemExit("Colonnes manquantes: "+", ".join(missing))

def q(v):
    if v is None: return "NULL"
    if isinstance(v,(date,datetime)): return "'" + v.strftime("%Y-%m-%d") + "'"
    return "'" + str(v).replace("'","''").strip() + "'"

def q_date(v):
    """Retourne toujours une date SQL ISO YYYY-MM-DD, même si Excel fournit DD/MM/YYYY."""
    if v is None or str(v).strip() == "":
        return "NULL"
    if isinstance(v, (date, datetime)):
        return "'" + v.strftime("%Y-%m-%d") + "'"
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return "'" + datetime.strptime(s, fmt).strftime("%Y-%m-%d") + "'"
        except ValueError:
            pass
    raise SystemExit(f"Date de naissance FFRS invalide ou non reconnue: {s!r}")

vals=[]
for r in rows:
    if not r[idx["Nom"]]: continue
    typ=str(r[idx["Type"]] or "").strip()
    # Le produit ne conserve volontairement que Loisir / Compétition.
    typ = typ if typ in ("Loisir","Compétition") else None
    fields=[r[idx["Code Adhérent"]],r[idx["Nom"]],r[idx["Prénom"]]]
    birth_date = r[idx["Date de naissance"]]
    tail=[typ,r[idx["Catégorie âge"]]]
    vals.append("(" + ",".join(q(x) for x in fields) + "," + q_date(birth_date) + "," + ",".join(q(x) for x in tail) + ")")

print("""BEGIN;
CREATE TEMP TABLE tmp_ffrs(
 licence text, nom text, prenom text, date_naissance date, type_licence text, categorie text
) ON COMMIT DROP;
INSERT INTO tmp_ffrs VALUES""")
print(",\n".join(vals) + ";")
print(r"""
CREATE TEMP TABLE tmp_ffrs_match AS
WITH candidates AS (
 SELECT DISTINCT f.*, p.id personne_id, COALESCE(p.archive,false) archive
 FROM tmp_ffrs f
 JOIN personne p
   ON lower(trim(p.last_name)) = lower(trim(f.nom))
  AND lower(trim(p.first_name)) = lower(trim(f.prenom))
  AND p.date_naissance = f.date_naissance
 WHERE EXISTS (
   SELECT 1 FROM login_project lp
   WHERE lp.login_id = p.compte AND lp.project_id = 1
 )
), ranked AS (
 SELECT c.*,
        MIN(c.archive::int) OVER (PARTITION BY c.licence,c.nom,c.prenom,c.date_naissance) best_archive_rank
 FROM candidates c
), preferred AS (
 SELECT * FROM ranked WHERE archive::int = best_archive_rank
)
SELECT p.*,
       count(*) OVER (PARTITION BY p.licence,p.nom,p.prenom,p.date_naissance) match_count
FROM preferred p;

-- Numéro de licence : définition existante "Numéro de licence".
INSERT INTO addinfo(object_id, object_type, value_type, text, project_id)
SELECT m.personne_id, 'PERSONNE', d.id::text, m.licence, 1
FROM tmp_ffrs_match m
JOIN addinfo d ON d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Numéro de licence'
WHERE m.match_count=1 AND NULLIF(m.licence,'') IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE addinfo a SET text=m.licence
FROM tmp_ffrs_match m, addinfo d
WHERE d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Numéro de licence'
  AND a.object_id=m.personne_id AND a.object_type='PERSONNE' AND a.value_type=d.id::text
  AND m.match_count=1 AND NULLIF(m.licence,'') IS NOT NULL;

-- Catégorie et type.
INSERT INTO addinfo(object_id, object_type, value_type, text, project_id)
SELECT m.personne_id,'PERSONNE',d.id::text,m.categorie,1
FROM tmp_ffrs_match m JOIN addinfo d ON d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Catégorie FFRS'
WHERE m.match_count=1 AND NULLIF(m.categorie,'') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM addinfo a WHERE a.object_id=m.personne_id AND a.object_type='PERSONNE' AND a.value_type=d.id::text);
UPDATE addinfo a SET text=m.categorie
FROM tmp_ffrs_match m, addinfo d
WHERE d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Catégorie FFRS'
  AND a.object_id=m.personne_id AND a.object_type='PERSONNE' AND a.value_type=d.id::text AND m.match_count=1;

INSERT INTO addinfo(object_id, object_type, value_type, text, project_id)
SELECT m.personne_id,'PERSONNE',d.id::text,m.type_licence,1
FROM tmp_ffrs_match m JOIN addinfo d ON d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Type licence FFRS'
WHERE m.match_count=1 AND m.type_licence IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM addinfo a WHERE a.object_id=m.personne_id AND a.object_type='PERSONNE' AND a.value_type=d.id::text);
UPDATE addinfo a SET text=m.type_licence
FROM tmp_ffrs_match m, addinfo d
WHERE d.object_id=0 AND d.object_type='PERSONNE' AND d.text='Type licence FFRS'
  AND a.object_id=m.personne_id AND a.object_type='PERSONNE' AND a.value_type=d.id::text AND m.match_count=1;

-- Les représentants légaux sont volontairement exclus de cet import.
-- Ils sont gérés dans la table dédiée representant_legal par un import séparé.

-- Contrôle avant COMMIT : les lignes FFRS sans correspondance exacte restent visibles.
SELECT f."Nom", f."Prénom", f."Date de naissance", f."Code Adhérent"
FROM (SELECT nom AS "Nom", prenom AS "Prénom", date_naissance AS "Date de naissance", licence AS "Code Adhérent" FROM tmp_ffrs) f
WHERE NOT EXISTS (
 SELECT 1 FROM tmp_ffrs_match m WHERE m.nom=f."Nom" AND m.prenom=f."Prénom"
   AND m.date_naissance=f."Date de naissance" AND m.match_count=1
)
ORDER BY f."Nom",f."Prénom";
COMMIT;
""")
