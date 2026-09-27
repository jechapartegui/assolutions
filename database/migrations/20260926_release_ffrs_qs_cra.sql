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

-- 1) Addinfo FFRS : on conserve le champ "Numéro de licence" existant.
DO $$
DECLARE
  v_cat_id integer;
  v_type_id integer;
BEGIN
  SELECT id INTO v_cat_id FROM addinfo
   WHERE object_id = 0 AND object_type = 'PERSONNE' AND text = 'Catégorie FFRS' LIMIT 1;
  IF v_cat_id IS NULL THEN
    SELECT COALESCE(MAX(id),0)+1 INTO v_cat_id FROM addinfo;
    INSERT INTO addinfo(id, object_id, object_type, value_type, text, project_id)
    VALUES (v_cat_id, 0, 'PERSONNE',
      'select:["Senior","Senior (U20+)","U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16","U18","U19"]',
      'Catégorie FFRS', 1);
  END IF;

  SELECT id INTO v_type_id FROM addinfo
   WHERE object_id = 0 AND object_type = 'PERSONNE' AND text = 'Type licence FFRS' LIMIT 1;
  IF v_type_id IS NULL THEN
    SELECT COALESCE(MAX(id),0)+1 INTO v_type_id FROM addinfo;
    INSERT INTO addinfo(id, object_id, object_type, value_type, text, project_id)
    VALUES (v_type_id, 0, 'PERSONNE', 'select:["Loisir","Compétition"]', 'Type licence FFRS', 1);
  END IF;

  PERFORM setval(pg_get_serial_sequence('addinfo','id'), (SELECT MAX(id) FROM addinfo), true);
END $$;

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
  date_validation timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cra_contrat_mois UNIQUE(contrat_prof_id, annee, mois)
);

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

-- Fix 98 : aucune règle du coeur PERSONNE n'est relâchée ; l'anonymisation conserve des valeurs neutres.

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
