BEGIN;

ALTER TABLE public.souscription_personne
  ADD COLUMN IF NOT EXISTS type_licence character varying(30) NOT NULL DEFAULT 'LOISIR';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_personne_type_licence') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT ck_souscription_personne_type_licence
      CHECK (type_licence IN ('LOISIR', 'COMPETITION'));
  END IF;
END $$;

COMMIT;
