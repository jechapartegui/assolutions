/*
  Tunnel de souscription Assolutions
  ---------------------------------
  Migration additive et idempotente prévue pour la base issue de to_share.sql.

  Règles importantes :
  - naissance_avant = année la plus ancienne admise, ex. 2008 ;
  - naissance_apres = année la plus récente admise, ex. 2013 ;
  - une inscription active compte dans la capacité d'un groupe ;
  - une souscription payée en plusieurs fois est active dès le premier paiement confirmé ;
  - aucun groupe n'est configuré ni imposé par défaut.
*/

BEGIN;

/* Nettoyage au cas où une première version de la migration aurait été exécutée. */
DROP INDEX IF EXISTS public.uq_groupes_un_defaut_par_saison;
ALTER TABLE public.groupes DROP COLUMN IF EXISTS par_defaut;

ALTER TABLE public.souscription
  ADD COLUMN IF NOT EXISTS project_id integer NULL,
  ADD COLUMN IF NOT EXISTS compte_id integer NULL,
  ADD COLUMN IF NOT EXISTS montant_initial_centimes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_remise_centimes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_echeances integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS code_promo_applique character varying(50) NULL,
  ADD COLUMN IF NOT EXISTS helloasso_payment_state character varying(80) NULL,
  ADD COLUMN IF NOT EXISTS finalized_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS canceled_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS error_message text NULL;

UPDATE public.souscription s
SET project_id = saison.project_id
FROM public.saison saison
WHERE saison.id = s.saison_id
  AND s.project_id IS NULL;

UPDATE public.souscription
SET montant_initial_centimes = COALESCE(montant_total_centimes, 0)
                              + COALESCE(montant_remise_centimes, 0)
WHERE montant_initial_centimes = 0
  AND COALESCE(montant_total_centimes, 0) > 0;

ALTER TABLE public.souscription_personne
  ADD COLUMN IF NOT EXISTS remise_centimes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inscription_saison_id integer NULL;

CREATE TABLE IF NOT EXISTS public.code_promo (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NOT NULL,
  code character varying(50) NOT NULL,
  libelle character varying(150) NOT NULL,
  type_remise character varying(20) NOT NULL,
  valeur integer NOT NULL,
  montant_min_centimes integer NULL,
  max_remise_centimes integer NULL,
  date_debut date NULL,
  date_fin date NULL,
  limit_nb integer NULL,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  CONSTRAINT ck_code_promo_type CHECK (type_remise IN ('POURCENTAGE', 'MONTANT')),
  CONSTRAINT ck_code_promo_valeur CHECK (valeur > 0),
  CONSTRAINT ck_code_promo_dates CHECK (date_debut IS NULL OR date_fin IS NULL OR date_debut <= date_fin),
  CONSTRAINT ck_code_promo_limite CHECK (limit_nb IS NULL OR limit_nb > 0),
  CONSTRAINT ck_code_promo_minimum CHECK (montant_min_centimes IS NULL OR montant_min_centimes >= 0),
  CONSTRAINT ck_code_promo_maximum CHECK (max_remise_centimes IS NULL OR max_remise_centimes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_code_promo_saison_code
  ON public.code_promo (saison_id, lower(btrim(code)));

CREATE INDEX IF NOT EXISTS ix_code_promo_project_saison
  ON public.code_promo (project_id, saison_id, actif);

CREATE TABLE IF NOT EXISTS public.code_promo_tarif (
  id serial PRIMARY KEY,
  code_promo_id integer NOT NULL,
  tarif_inscription_id integer NOT NULL,
  CONSTRAINT uq_code_promo_tarif UNIQUE (code_promo_id, tarif_inscription_id)
);

CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_code
  ON public.code_promo_tarif (code_promo_id);

CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_tarif
  ON public.code_promo_tarif (tarif_inscription_id);

CREATE TABLE IF NOT EXISTS public.souscription_evenement (
  id bigserial PRIMARY KEY,
  souscription_id integer NOT NULL,
  type_evenement character varying(80) NOT NULL,
  details jsonb NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_souscription_evenement_souscription
  ON public.souscription_evenement (souscription_id, created_at);

CREATE INDEX IF NOT EXISTS ix_souscription_compte_saison
  ON public.souscription (compte_id, saison_id, statut);

CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_un_brouillon_compte_saison
  ON public.souscription (compte_id, saison_id)
  WHERE statut = 'BROUILLON' AND compte_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_souscription_checkout
  ON public.souscription (helloasso_checkout_intent_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_personne_unique
  ON public.souscription_personne (souscription_id, personne_id);

CREATE INDEX IF NOT EXISTS ix_souscription_personne_tarif
  ON public.souscription_personne (tarif_inscription_id);

CREATE INDEX IF NOT EXISTS ix_souscription_personne_personne
  ON public.souscription_personne (personne_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_saison') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT fk_souscription_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_compte') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT fk_souscription_compte
      FOREIGN KEY (compte_id) REFERENCES public.compte(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_payeur') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT fk_souscription_payeur
      FOREIGN KEY (payeur_personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_code_promo') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT fk_souscription_code_promo
      FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_souscription') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT fk_souscription_personne_souscription
      FOREIGN KEY (souscription_id) REFERENCES public.souscription(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_personne') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT fk_souscription_personne_personne
      FOREIGN KEY (personne_id) REFERENCES public.personne(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_tarif') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT fk_souscription_personne_tarif
      FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_inscription_saison') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT fk_souscription_personne_inscription_saison
      FOREIGN KEY (inscription_saison_id) REFERENCES public.inscription_saison(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_groupe_ligne') THEN
    ALTER TABLE public.souscription_personne_groupe
      ADD CONSTRAINT fk_souscription_personne_groupe_ligne
      FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_groupe_groupe') THEN
    ALTER TABLE public.souscription_personne_groupe
      ADD CONSTRAINT fk_souscription_personne_groupe_groupe
      FOREIGN KEY (groupe_id) REFERENCES public.groupes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_project') THEN
    ALTER TABLE public.code_promo
      ADD CONSTRAINT fk_code_promo_project
      FOREIGN KEY (project_id) REFERENCES public.project(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_saison') THEN
    ALTER TABLE public.code_promo
      ADD CONSTRAINT fk_code_promo_saison
      FOREIGN KEY (saison_id) REFERENCES public.saison(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_tarif_code') THEN
    ALTER TABLE public.code_promo_tarif
      ADD CONSTRAINT fk_code_promo_tarif_code
      FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_tarif_tarif') THEN
    ALTER TABLE public.code_promo_tarif
      ADD CONSTRAINT fk_code_promo_tarif_tarif
      FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_evenement_souscription') THEN
    ALTER TABLE public.souscription_evenement
      ADD CONSTRAINT fk_souscription_evenement_souscription
      FOREIGN KEY (souscription_id) REFERENCES public.souscription(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_montants') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT ck_souscription_montants CHECK (
        montant_initial_centimes >= 0
        AND montant_remise_centimes >= 0
        AND montant_total_centimes >= 0
        AND montant_total_centimes = montant_initial_centimes - montant_remise_centimes
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_echeances') THEN
    ALTER TABLE public.souscription
      ADD CONSTRAINT ck_souscription_echeances CHECK (nb_echeances BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_personne_montants') THEN
    ALTER TABLE public.souscription_personne
      ADD CONSTRAINT ck_souscription_personne_montants CHECK (
        prix_initial_centimes >= 0
        AND remise_centimes >= 0
        AND prix_final_centimes >= 0
        AND prix_final_centimes = prix_initial_centimes - remise_centimes
      );
  END IF;
END $$;

COMMIT;
