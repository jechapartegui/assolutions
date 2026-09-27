#!/usr/bin/env python3
"""Génère un SQL idempotent d'import de l'extraction licences FFRS.

Usage:
  python scripts/generate_ffrs_import.py extraction_licences.xlsx > database/import_ffrs_2026_2027.sql

Le rapprochement se fait sur nom + prénom + date de naissance. Les lignes ambiguës
ne sont jamais appliquées : elles sont remontées à la fin du script SQL.
"""
from __future__ import annotations
import sys
from datetime import date, datetime
from openpyxl import load_workbook

if len(sys.argv) != 2:
    raise SystemExit("Usage: generate_ffrs_import.py <extraction_licences.xlsx>")

wb = load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb.active
rows = ws.iter_rows(values_only=True)
headers = [str(x or "").strip() for x in next(rows)]
idx = {h: i for i, h in enumerate(headers)}

required = ["Code Adhérent","Nom","Prénom","Date de naissance","Type","Catégorie âge",
"Nom du représentant légal","Prénom du représentant légal","Téléphone du représentant légal","Email du représentant légal",
"Nom du représentant légal 2","Prénom du représentant légal 2","Téléphone du représentant légal 2","Email du représentant légal 2"]
missing=[x for x in required if x not in idx]
if missing: raise SystemExit("Colonnes manquantes: "+", ".join(missing))

def q(v):
    if v is None: return "NULL"
    if isinstance(v,(date,datetime)): return "'" + v.strftime("%Y-%m-%d") + "'"
    return "'" + str(v).replace("'","''").strip() + "'"

vals=[]
for r in rows:
    if not r[idx["Nom"]]: continue
    typ=str(r[idx["Type"]] or "").strip()
    # Le produit ne conserve volontairement que Loisir / Compétition.
    typ = typ if typ in ("Loisir","Compétition") else None
    fields=[r[idx["Code Adhérent"]],r[idx["Nom"]],r[idx["Prénom"]],r[idx["Date de naissance"]],typ,r[idx["Catégorie âge"]]]
    for n in (1,2):
        suffix="" if n==1 else " 2"
        fields += [r[idx["Nom du représentant légal"+suffix]],r[idx["Prénom du représentant légal"+suffix]],
                   r[idx["Téléphone du représentant légal"+suffix]],r[idx["Email du représentant légal"+suffix]]]
    vals.append("(" + ",".join(q(x) for x in fields) + ")")

print("""BEGIN;
CREATE TEMP TABLE tmp_ffrs(
 licence text, nom text, prenom text, date_naissance date, type_licence text, categorie text,
 rl1_nom text, rl1_prenom text, rl1_tel text, rl1_email text,
 rl2_nom text, rl2_prenom text, rl2_tel text, rl2_email text
) ON COMMIT DROP;
INSERT INTO tmp_ffrs VALUES""")
print(",\n".join(vals) + ";")
print(r"""
CREATE TEMP TABLE tmp_ffrs_match AS
SELECT f.*, p.id personne_id,
       count(*) OVER (PARTITION BY f.licence, f.nom, f.prenom, f.date_naissance) match_count
FROM tmp_ffrs f
JOIN personne p
  ON lower(trim(p.last_name)) = lower(trim(f.nom))
 AND lower(trim(p.first_name)) = lower(trim(f.prenom))
 AND p.date_naissance = f.date_naissance;

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

-- Représentants légaux : une ligne structurée par représentant.
INSERT INTO contacts(object_type,object_id,contact_type,contact_value,diffusion,contact_list,info,pref,nom,prenom,email,telephone)
SELECT 'PERSONNE',m.personne_id,'REPRESENTANT_LEGAL',m.rl1_email,false,'representants_legaux',NULL,true,
       m.rl1_nom,m.rl1_prenom,m.rl1_email,m.rl1_tel
FROM tmp_ffrs_match m
WHERE m.match_count=1 AND NULLIF(m.rl1_nom,'') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.object_type='PERSONNE' AND c.object_id=m.personne_id
    AND c.contact_type='REPRESENTANT_LEGAL' AND lower(coalesce(c.email,''))=lower(coalesce(m.rl1_email,'')));

INSERT INTO contacts(object_type,object_id,contact_type,contact_value,diffusion,contact_list,info,pref,nom,prenom,email,telephone)
SELECT 'PERSONNE',m.personne_id,'REPRESENTANT_LEGAL',m.rl2_email,false,'representants_legaux',NULL,false,
       m.rl2_nom,m.rl2_prenom,m.rl2_email,m.rl2_tel
FROM tmp_ffrs_match m
WHERE m.match_count=1 AND NULLIF(m.rl2_nom,'') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.object_type='PERSONNE' AND c.object_id=m.personne_id
    AND c.contact_type='REPRESENTANT_LEGAL' AND lower(coalesce(c.email,''))=lower(coalesce(m.rl2_email,'')));

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
