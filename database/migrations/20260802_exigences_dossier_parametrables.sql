/*
  Exigences de dossier paramétrables
  ----------------------------------
  - une exigence peut concerner l'inscription ou la licence ;
  - une exigence de licence ne bloque pas l'adhésion ;
  - les données peuvent provenir de la personne, d'un contact, d'un document
    ou d'une réponse saisie pour la saison ;
  - les portées permettent de cibler tous les dossiers, certains groupes,
    certains tarifs ou des types de licence.
*/

BEGIN;

ALTER TABLE public.personne
  ADD COLUMN IF NOT EXISTS pays character varying(100) NULL;

ALTER TABLE public.document
  ADD COLUMN IF NOT EXISTS date_document date NULL,
  ADD COLUMN IF NOT EXISTS date_expiration date NULL,
  ADD COLUMN IF NOT EXISTS valide boolean NOT NULL DEFAULT true;

ALTER TABLE public.souscription_personne
  ADD COLUMN IF NOT EXISTS donnees_personne_snapshot jsonb NULL,
  ADD COLUMN IF NOT EXISTS informations_validees_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS dossier_complet boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.exigence_dossier (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NULL,
  code character varying(80) NOT NULL,
  libelle character varying(255) NOT NULL,
  description text NULL,
  usage character varying(20) NOT NULL DEFAULT 'INSCRIPTION',
  type_exigence character varying(30) NOT NULL,
  source_code character varying(100) NULL,
  type_reponse character varying(20) NOT NULL DEFAULT 'AUCUNE',
  obligatoire boolean NOT NULL DEFAULT true,
  bloquante boolean NOT NULL DEFAULT true,
  age_min integer NULL,
  age_max integer NULL,
  validite_mois integer NULL,
  texte_consentement text NULL,
  version_texte character varying(40) NULL,
  ordre integer NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  CONSTRAINT ck_exigence_dossier_usage
    CHECK (usage IN ('INSCRIPTION', 'LICENCE')),
  CONSTRAINT ck_exigence_dossier_type
    CHECK (type_exigence IN ('CHAMP_PERSONNE', 'CONTACT', 'DOCUMENT', 'CONSENTEMENT', 'DECLARATION')),
  CONSTRAINT ck_exigence_dossier_reponse
    CHECK (type_reponse IN ('AUCUNE', 'BOOLEEN', 'TEXTE', 'DATE', 'DOCUMENT')),
  CONSTRAINT ck_exigence_dossier_ages
    CHECK (
      (age_min IS NULL OR age_min >= 0)
      AND (age_max IS NULL OR age_max >= 0)
      AND (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
    ),
  CONSTRAINT ck_exigence_dossier_validite
    CHECK (validite_mois IS NULL OR validite_mois > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_project_saison_code
  ON public.exigence_dossier (
    project_id,
    COALESCE(saison_id, 0),
    lower(btrim(code))
  );

CREATE INDEX IF NOT EXISTS ix_exigence_dossier_project_saison
  ON public.exigence_dossier (project_id, saison_id, usage, actif, ordre);

CREATE TABLE IF NOT EXISTS public.exigence_dossier_portee (
  id serial PRIMARY KEY,
  exigence_id integer NOT NULL,
  type_portee character varying(30) NOT NULL,
  cible_id integer NULL,
  cible_code character varying(100) NULL,
  CONSTRAINT ck_exigence_dossier_portee_type
    CHECK (type_portee IN ('GENERAL', 'GROUPE', 'TARIF', 'TYPE_LICENCE')),
  CONSTRAINT ck_exigence_dossier_portee_cible
    CHECK (
      (type_portee = 'GENERAL' AND cible_id IS NULL AND cible_code IS NULL)
      OR (type_portee IN ('GROUPE', 'TARIF') AND cible_id IS NOT NULL AND cible_code IS NULL)
      OR (type_portee = 'TYPE_LICENCE' AND cible_id IS NULL AND cible_code IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_portee
  ON public.exigence_dossier_portee (
    exigence_id,
    type_portee,
    COALESCE(cible_id, 0),
    COALESCE(lower(btrim(cible_code)), '')
  );

CREATE INDEX IF NOT EXISTS ix_exigence_dossier_portee_exigence
  ON public.exigence_dossier_portee (exigence_id);

CREATE TABLE IF NOT EXISTS public.reponse_exigence_dossier (
  id bigserial PRIMARY KEY,
  exigence_id integer NOT NULL,
  personne_id integer NOT NULL,
  saison_id integer NOT NULL,
  souscription_personne_id integer NULL,
  contexte_type character varying(30) NOT NULL DEFAULT 'SAISON',
  contexte_id integer NULL,
  valeur_boolean boolean NULL,
  valeur_texte text NULL,
  valeur_date date NULL,
  document_id integer NULL,
  texte_accepte text NULL,
  version_acceptee character varying(40) NULL,
  repondu_par_personne_id integer NULL,
  date_reponse timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  CONSTRAINT ck_reponse_exigence_contexte
    CHECK (contexte_type IN ('SAISON', 'SOUSCRIPTION', 'LICENCE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reponse_exigence_saison_personne
  ON public.reponse_exigence_dossier (
    exigence_id,
    personne_id,
    saison_id,
    contexte_type,
    COALESCE(contexte_id, 0)
  );

CREATE INDEX IF NOT EXISTS ix_reponse_exigence_personne_saison
  ON public.reponse_exigence_dossier (personne_id, saison_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_dossier_project') THEN
    ALTER TABLE public.exigence_dossier
      ADD CONSTRAINT fk_exigence_dossier_project
      FOREIGN KEY (project_id) REFERENCES public.project(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_dossier_saison') THEN
    ALTER TABLE public.exigence_dossier
      ADD CONSTRAINT fk_exigence_dossier_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_portee_exigence') THEN
    ALTER TABLE public.exigence_dossier_portee
      ADD CONSTRAINT fk_exigence_portee_exigence
      FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_exigence') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_exigence
      FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_personne') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_personne
      FOREIGN KEY (personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_saison') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_souscription_personne') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_souscription_personne
      FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_document') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_document
      FOREIGN KEY (document_id) REFERENCES public.document(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_repondant') THEN
    ALTER TABLE public.reponse_exigence_dossier
      ADD CONSTRAINT fk_reponse_exigence_repondant
      FOREIGN KEY (repondu_par_personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
