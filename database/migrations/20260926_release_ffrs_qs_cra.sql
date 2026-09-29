-- Release FFRS / représentants légaux / QS Sport / CRA
-- 2026-09-26
-- Script idempotent : peut être rejoué.
BEGIN;

-- Pré-requis issus du socle historique encore utilisé par le code actuel.
ALTER TABLE public.exigence_dossier_portee
  ADD COLUMN IF NOT EXISTS obligatoire_override boolean NULL,
  ADD COLUMN IF NOT EXISTS bloquante_override boolean NULL;
ALTER TABLE public.saison
  ADD COLUMN IF NOT EXISTS tarif_avant_groupes boolean NOT NULL DEFAULT false;
ALTER TABLE public.saison
  ADD COLUMN IF NOT EXISTS inscriptions_ouvertes boolean NOT NULL DEFAULT true;

-- 1) Addinfo FFRS : trois champs canoniques PERSONNE.
-- Catégorie reste un champ texte : la liste complète des catégories dépasse la
-- limite historique de 50 caractères de addinfo.value_type.
INSERT INTO addinfo(object_id, object_type, value_type, text, project_id)
SELECT 0, 'PERSONNE', 'string', v.label, 1
FROM (VALUES
  ('Numéro de licence'),
  ('Catégorie FFRS'),
  ('Type licence FFRS')
) AS v(label)
WHERE NOT EXISTS (
  SELECT 1 FROM addinfo a
  WHERE a.object_id=0 AND a.object_type='PERSONNE' AND a.project_id=1
    AND lower(trim(a.text))=lower(trim(v.label))
);

-- 2) Représentants légaux : objet dédié, sans polluer la table générique contacts.
-- Les DROP corrigent sans risque une exécution d'une version intermédiaire de cette migration.
DROP INDEX IF EXISTS idx_contacts_representant_legal;
ALTER TABLE contacts DROP COLUMN IF EXISTS nom;
ALTER TABLE contacts DROP COLUMN IF EXISTS prenom;
ALTER TABLE contacts DROP COLUMN IF EXISTS email;
ALTER TABLE contacts DROP COLUMN IF EXISTS telephone;

CREATE TABLE IF NOT EXISTS representant_legal (
  id serial PRIMARY KEY,
  personne_id integer NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
  nom varchar(100) NOT NULL,
  prenom varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  telephone varchar(50) NOT NULL,
  ordre smallint NOT NULL DEFAULT 1 CHECK (ordre BETWEEN 1 AND 2),
  CONSTRAINT uq_representant_legal_personne_ordre UNIQUE(personne_id, ordre)
);
CREATE INDEX IF NOT EXISTS idx_representant_legal_personne
  ON representant_legal(personne_id);

-- 3) QS Sport : preuve_medicale existe déjà dans le modèle dossier.
-- L'interface en ligne ne stocke que qs_reponses_negatives, jamais les 9 réponses de santé.
ALTER TABLE inscription_saison
  ADD COLUMN IF NOT EXISTS qs_sport_atteste_non boolean NOT NULL DEFAULT false;

-- 4) CRA mensuel.
CREATE TABLE IF NOT EXISTS cra (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NOT NULL REFERENCES saison(id),
  contrat_prof_id integer NOT NULL REFERENCES contrat_prof(id),
  annee integer NOT NULL,
  mois integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  statut varchar(30) NOT NULL DEFAULT 'BROUILLON',
  montant_total numeric(12,2) NOT NULL DEFAULT 0,
  commentaire_club text NULL,
  date_validation timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cra_contrat_mois UNIQUE(contrat_prof_id, annee, mois)
);

ALTER TABLE cra ADD COLUMN IF NOT EXISTS commentaire_club text NULL;

CREATE TABLE IF NOT EXISTS cra_ligne (
  id serial PRIMARY KEY,
  cra_id integer NOT NULL REFERENCES cra(id) ON DELETE CASCADE,
  seance_professeur_id integer NULL REFERENCES seance_professeur(id),
  date date NOT NULL,
  type varchar(30) NOT NULL,
  libelle varchar(255) NOT NULL,
  quantite numeric(10,2) NOT NULL DEFAULT 1,
  taux numeric(10,2) NOT NULL DEFAULT 0,
  montant numeric(12,2) NOT NULL,
  CONSTRAINT uq_cra_ligne_seance_prof UNIQUE(cra_id, seance_professeur_id)
);

CREATE TABLE IF NOT EXISTS facture_prof (
  id serial PRIMARY KEY,
  cra_id integer NOT NULL UNIQUE REFERENCES cra(id),
  flux_financier_id integer NULL REFERENCES flux_financier(id),
  document_id integer NULL REFERENCES document(id),
  numero varchar(100) NULL,
  date_facture date NOT NULL,
  montant_ttc numeric(12,2) NOT NULL,
  statut varchar(30) NOT NULL DEFAULT 'DEPOSEE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cra_project_period ON cra(project_id, annee, mois);
CREATE INDEX IF NOT EXISTS idx_cra_ligne_cra ON cra_ligne(cra_id);
CREATE INDEX IF NOT EXISTS idx_facture_prof_flux ON facture_prof(flux_financier_id);

-- Fix 98 : aucune règle du coeur PERSONNE n'est relâchée.
-- Répare aussi une base locale ayant exécuté la version intermédiaire qui avait retiré les NOT NULL.
UPDATE personne
SET date_naissance = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1)
WHERE date_naissance IS NULL;
UPDATE personne
SET address = '{"Street":"Adresse anonymisée","PostCode":"00000","City":"Ville anonymisée","Country":"France"}'
WHERE address IS NULL;
UPDATE personne
SET pays = 'France'
WHERE pays IS NULL;

ALTER TABLE personne ALTER COLUMN date_naissance SET NOT NULL;
ALTER TABLE personne ALTER COLUMN address SET NOT NULL;
ALTER TABLE personne ALTER COLUMN pays SET NOT NULL;

-- Fix 98 : journal minimal des demandes RGPD, sans conserver l'identité effacée.
CREATE TABLE IF NOT EXISTS rgpd_erasure_log (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  compte_id integer NOT NULL,
  nb_personnes integer NOT NULL DEFAULT 0,
  traite_par_compte_id integer NULL,
  date_traitement timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rgpd_erasure_log_project_date
  ON rgpd_erasure_log(project_id, date_traitement DESC);

COMMIT;
