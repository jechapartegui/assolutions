/*
  Finalisation des dossiers et preuves médicales
  ----------------------------------------------
  Migration additive et idempotente.
*/

BEGIN;

UPDATE public.personne
SET pays = 'France'
WHERE pays IS NULL OR btrim(pays) = '';

ALTER TABLE public.personne
  ALTER COLUMN pays SET DEFAULT 'France';

ALTER TABLE public.document
  ADD COLUMN IF NOT EXISTS medecin_nom character varying(150) NULL,
  ADD COLUMN IF NOT EXISTS medecin_rpps character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS mention_competition boolean NOT NULL DEFAULT false;

ALTER TABLE public.exigence_dossier
  DROP CONSTRAINT IF EXISTS ck_exigence_dossier_type;

ALTER TABLE public.exigence_dossier
  ADD CONSTRAINT ck_exigence_dossier_type
  CHECK (
    type_exigence IN (
      'CHAMP_PERSONNE',
      'CONTACT',
      'DOCUMENT',
      'PREUVE_MEDICALE',
      'CONSENTEMENT',
      'DECLARATION'
    )
  );

CREATE TABLE IF NOT EXISTS public.dossier_personne_saison (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NOT NULL,
  personne_id integer NOT NULL,
  type_licence character varying(30) NOT NULL DEFAULT 'LOISIR',
  informations_validees_at timestamp without time zone NULL,
  donnees_personne_snapshot jsonb NULL,
  inscription_complete boolean NOT NULL DEFAULT false,
  licence_eligible boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  CONSTRAINT ck_dossier_personne_type_licence
    CHECK (type_licence IN ('LOISIR', 'COMPETITION')),
  CONSTRAINT uq_dossier_personne_saison
    UNIQUE (project_id, saison_id, personne_id)
);

CREATE INDEX IF NOT EXISTS ix_dossier_personne_saison_personne
  ON public.dossier_personne_saison (personne_id, saison_id);

CREATE TABLE IF NOT EXISTS public.preuve_medicale (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  personne_id integer NOT NULL,
  saison_id integer NOT NULL,
  type_preuve character varying(30) NOT NULL,
  date_document date NOT NULL,
  qs_reponses_negatives boolean NULL,
  valable_competition boolean NOT NULL DEFAULT false,
  medecin_nom character varying(150) NULL,
  medecin_rpps character varying(20) NULL,
  document_id integer NULL,
  valide boolean NOT NULL DEFAULT true,
  commentaire text NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  CONSTRAINT ck_preuve_medicale_type
    CHECK (type_preuve IN ('CERTIFICAT', 'QS_SPORT')),
  CONSTRAINT ck_preuve_medicale_certificat
    CHECK (
      type_preuve <> 'CERTIFICAT'
      OR (
        medecin_nom IS NOT NULL
        AND btrim(medecin_nom) <> ''
        AND medecin_rpps IS NOT NULL
        AND btrim(medecin_rpps) <> ''
      )
    ),
  CONSTRAINT ck_preuve_medicale_qs
    CHECK (
      type_preuve <> 'QS_SPORT'
      OR qs_reponses_negatives IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS ix_preuve_medicale_personne
  ON public.preuve_medicale (project_id, personne_id, date_document DESC);

CREATE INDEX IF NOT EXISTS ix_preuve_medicale_saison
  ON public.preuve_medicale (project_id, saison_id, personne_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_project') THEN
    ALTER TABLE public.dossier_personne_saison
      ADD CONSTRAINT fk_dossier_personne_project
      FOREIGN KEY (project_id) REFERENCES public.project(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_saison') THEN
    ALTER TABLE public.dossier_personne_saison
      ADD CONSTRAINT fk_dossier_personne_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_personne') THEN
    ALTER TABLE public.dossier_personne_saison
      ADD CONSTRAINT fk_dossier_personne_personne
      FOREIGN KEY (personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_project') THEN
    ALTER TABLE public.preuve_medicale
      ADD CONSTRAINT fk_preuve_medicale_project
      FOREIGN KEY (project_id) REFERENCES public.project(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_personne') THEN
    ALTER TABLE public.preuve_medicale
      ADD CONSTRAINT fk_preuve_medicale_personne
      FOREIGN KEY (personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_saison') THEN
    ALTER TABLE public.preuve_medicale
      ADD CONSTRAINT fk_preuve_medicale_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_document') THEN
    ALTER TABLE public.preuve_medicale
      ADD CONSTRAINT fk_preuve_medicale_document
      FOREIGN KEY (document_id) REFERENCES public.document(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
