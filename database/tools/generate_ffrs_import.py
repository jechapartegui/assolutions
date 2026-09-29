#!/usr/bin/env python3
"""Génère un SQL idempotent d'import de l'extraction licences FFRS.

Usage recommandé (evite tout problème d'encodage PowerShell) :
  py database/tools/generate_ffrs_import.py extraction_licences.xlsx database/generated/import_ffrs_2026_2027.sql

Le fichier SQL genere est volontairement ASCII-only : les caracteres Unicode
sont encodes en hexadécimal puis reconstruits par PostgreSQL. Ainsi
"Competition" ne peut plus devenir "CompÚtition" lors d'une redirection Windows.
"""
from __future__ import annotations
import sys
import unicodedata
from datetime import date, datetime
from openpyxl import load_workbook

if len(sys.argv) not in (2, 3):
    raise SystemExit("Usage: generate_ffrs_import.py <extraction_licences.xlsx> [sortie.sql]")

source = sys.argv[1]
output = sys.argv[2] if len(sys.argv) == 3 else None
wb = load_workbook(source, read_only=True, data_only=True)
ws = wb.active
rows = ws.iter_rows(values_only=True)
headers = [str(x or "").strip() for x in next(rows)]

def header_key(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in value if not unicodedata.combining(ch)).strip().casefold()

idx = {header_key(h): i for i, h in enumerate(headers)}

required = ["Code Adherent", "Nom", "Prenom", "Date de naissance", "Type", "Categorie age"]
missing = [x for x in required if header_key(x) not in idx]
if missing:
    raise SystemExit("Colonnes manquantes: " + ", ".join(missing))

def col(name):
    return idx[header_key(name)]

def sql_text(v):
    if v is None or str(v).strip() == "":
        return "NULL"
    raw = str(v).strip().encode("utf-8").hex()
    return f"convert_from(decode('{raw}','hex'),'UTF8')"

def sql_date(v):
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

records = []
for row in rows:
    if not row[col("Nom")]:
        continue
    typ = str(row[col("Type")] or "").strip()
    # Les licences techniques/dirigeant ne doivent pas écraser une licence sportive.
    if typ not in ("Loisir", "Compétition"):
        typ = None
    records.append(
        "(" + ",".join([
            sql_text(row[col("Code Adherent")]),
            sql_text(row[col("Nom")]),
            sql_text(row[col("Prenom")]),
            sql_date(row[col("Date de naissance")]),
            sql_text(typ),
            sql_text(row[col("Categorie age")]),
        ]) + ")"
    )

sql = """BEGIN;

CREATE TEMP TABLE tmp_ffrs_raw(
  licence text, nom text, prenom text, date_naissance date, type_licence text, categorie text
) ON COMMIT DROP;
INSERT INTO tmp_ffrs_raw VALUES
""" + ",\n".join(records) + """;

-- Une personne peut avoir plusieurs lignes FFRS (ex. Dirigeant + Compétition).
-- On garde une seule ligne par licencié et on privilégie Compétition puis Loisir.
CREATE TEMP TABLE tmp_ffrs AS
SELECT licence, nom, prenom, date_naissance,
       CASE
         WHEN bool_or(type_licence = convert_from(decode('436f6d70c3a9746974696f6e','hex'),'UTF8'))
           THEN convert_from(decode('436f6d70c3a9746974696f6e','hex'),'UTF8')
         WHEN bool_or(type_licence = 'Loisir') THEN 'Loisir'
         ELSE NULL
       END AS type_licence,
       max(categorie) FILTER (WHERE NULLIF(categorie,'') IS NOT NULL) AS categorie
FROM tmp_ffrs_raw
GROUP BY licence, nom, prenom, date_naissance;

-- Libelles canoniques reconstruits depuis UTF-8 : le SQL reste 100% ASCII.
CREATE TEMP TABLE tmp_ffrs_defs(label text, kind text) ON COMMIT DROP;
INSERT INTO tmp_ffrs_defs VALUES
  (convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8'), 'string'),
  (convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8'), 'string'),
  ('Type licence FFRS', 'string');

-- Repare les doublons mojibake deja crees (NumÚro / CatÚgorie) en migrant
-- leurs valeurs vers le champ canonique avant suppression.
CREATE TEMP TABLE tmp_ffrs_bad_defs AS
SELECT a.id bad_id, d.label
FROM addinfo a
JOIN tmp_ffrs_defs d ON (
  lower(trim(a.text)) = lower(trim(d.label))
  OR (d.label = convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8') AND lower(trim(a.text)) = lower(convert_from(decode('4e756dc39a726f206465206c6963656e6365','hex'),'UTF8')))
  OR (d.label = convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8') AND lower(trim(a.text)) = lower(convert_from(decode('436174c39a676f7269652046465253','hex'),'UTF8')))
)
WHERE a.object_id=0 AND a.object_type='PERSONNE' AND a.project_id=1;

INSERT INTO addinfo(object_id,object_type,value_type,text,project_id)
SELECT 0,'PERSONNE',d.kind,d.label,1
FROM tmp_ffrs_defs d
WHERE NOT EXISTS (
 SELECT 1 FROM addinfo a WHERE a.object_id=0 AND a.object_type='PERSONNE'
 AND a.project_id=1 AND lower(trim(a.text))=lower(trim(d.label))
);

CREATE TEMP TABLE tmp_ffrs_canonical_defs AS
SELECT DISTINCT ON (lower(trim(d.label))) a.id canonical_id, d.label
FROM tmp_ffrs_defs d
JOIN addinfo a ON a.object_id=0 AND a.object_type='PERSONNE' AND a.project_id=1
 AND lower(trim(a.text))=lower(trim(d.label))
ORDER BY lower(trim(d.label)), a.id;

-- Si une valeur existe sur le champ corrompu et pas encore sur le canonique, on la rattache.
UPDATE addinfo v
SET value_type=c.canonical_id::text
FROM tmp_ffrs_bad_defs b
JOIN tmp_ffrs_canonical_defs c ON lower(trim(c.label))=lower(trim(b.label))
WHERE v.object_type='PERSONNE' AND v.project_id=1 AND v.value_type=b.bad_id::text
  AND b.bad_id<>c.canonical_id
  AND NOT EXISTS (
    SELECT 1 FROM addinfo x WHERE x.object_type='PERSONNE' AND x.project_id=1
      AND x.object_id=v.object_id AND x.value_type=c.canonical_id::text
  );

-- En cas de valeur deja presente sur les deux champs, le champ canonique gagne.
DELETE FROM addinfo v
USING tmp_ffrs_bad_defs b, tmp_ffrs_canonical_defs c
WHERE lower(trim(c.label))=lower(trim(b.label))
  AND b.bad_id<>c.canonical_id
  AND v.object_type='PERSONNE' AND v.project_id=1 AND v.value_type=b.bad_id::text;

DELETE FROM addinfo a
USING tmp_ffrs_bad_defs b, tmp_ffrs_canonical_defs c
WHERE a.id=b.bad_id AND lower(trim(c.label))=lower(trim(b.label))
  AND b.bad_id<>c.canonical_id;

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

-- UPSERT explicite par personne/champ. Ne dépend pas d'une contrainte ON CONFLICT.
WITH defs AS (
 SELECT DISTINCT ON (lower(trim(text))) id, lower(trim(text)) label
 FROM addinfo
 WHERE object_id=0 AND object_type='PERSONNE' AND project_id=1
   AND lower(trim(text)) IN (
     lower(convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8')), lower(convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8')), lower('Type licence FFRS')
   )
 ORDER BY lower(trim(text)), id
), src AS (
 SELECT m.personne_id, d.id field_id, v.val
 FROM tmp_ffrs_match m
 CROSS JOIN LATERAL (VALUES
   (lower(convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8')), m.licence),
   (lower(convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8')), m.categorie),
   (lower('Type licence FFRS'), m.type_licence)
 ) v(label,val)
 JOIN defs d ON d.label=v.label
 WHERE m.match_count=1 AND NULLIF(v.val,'') IS NOT NULL
)
UPDATE addinfo a
SET text=src.val, project_id=1
FROM src
WHERE a.object_id=src.personne_id
  AND a.object_type='PERSONNE'
  AND a.value_type=src.field_id::text;

WITH defs AS (
 SELECT DISTINCT ON (lower(trim(text))) id, lower(trim(text)) label
 FROM addinfo
 WHERE object_id=0 AND object_type='PERSONNE' AND project_id=1
   AND lower(trim(text)) IN (
     lower(convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8')), lower(convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8')), lower('Type licence FFRS')
   )
 ORDER BY lower(trim(text)), id
), src AS (
 SELECT m.personne_id, d.id field_id, v.val
 FROM tmp_ffrs_match m
 CROSS JOIN LATERAL (VALUES
   (lower(convert_from(decode('4e756dc3a9726f206465206c6963656e6365','hex'),'UTF8')), m.licence),
   (lower(convert_from(decode('436174c3a9676f7269652046465253','hex'),'UTF8')), m.categorie),
   (lower('Type licence FFRS'), m.type_licence)
 ) v(label,val)
 JOIN defs d ON d.label=v.label
 WHERE m.match_count=1 AND NULLIF(v.val,'') IS NOT NULL
)
INSERT INTO addinfo(object_id, object_type, value_type, text, project_id)
SELECT src.personne_id, 'PERSONNE', src.field_id::text, src.val, 1
FROM src
WHERE NOT EXISTS (
 SELECT 1 FROM addinfo a
 WHERE a.object_id=src.personne_id AND a.object_type='PERSONNE'
   AND a.value_type=src.field_id::text AND a.project_id=1
);

-- Contrôles : ces SELECT doivent être regardés après import.
SELECT 'FFRS_SANS_CORRESPONDANCE' controle, f.nom, f.prenom, f.date_naissance, f.licence
FROM tmp_ffrs f
WHERE NOT EXISTS (
 SELECT 1 FROM tmp_ffrs_match m
 WHERE m.licence=f.licence AND m.nom=f.nom AND m.prenom=f.prenom
   AND m.date_naissance=f.date_naissance AND m.match_count=1
)
ORDER BY f.nom,f.prenom;

SELECT 'FFRS_IMPORTES' controle,
       count(DISTINCT personne_id) personnes,
       count(*) FILTER (WHERE NULLIF(licence,'') IS NOT NULL) numeros_licence,
       count(*) FILTER (WHERE NULLIF(categorie,'') IS NOT NULL) categories,
       count(*) FILTER (WHERE type_licence IS NOT NULL) types_licence
FROM tmp_ffrs_match
WHERE match_count=1;

COMMIT;
"""

if output:
    with open(output, "w", encoding="ascii", newline="\n") as fh:
        fh.write(sql)
    print(f"SQL généré : {output}")
else:
    sys.stdout.write(sql)
