/*
  Assolutions - mise à niveau PRODUCTION vers le modèle de souscription
  ====================================================================
  Source de comparaison :
    - prod_no_data_db.sql
    - local_no_data_db.sql

  Ce script est additif et idempotent :
    - il ne supprime aucune donnée métier existante ;
    - il ajoute les critères des groupes, le pays, les métadonnées documentaires ;
    - il crée le tunnel de souscription, les tarifs, les codes promo ;
    - il crée les exigences paramétrables, les réponses et les preuves médicales ;
    - il crée un paramétrage de départ pour la saison active.

  À exécuter une seule fois sur la production après sauvegarde.
*/

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '0';

DO $$
BEGIN
  IF to_regclass('public.personne') IS NULL
     OR to_regclass('public.groupes') IS NULL
     OR to_regclass('public.document') IS NULL
     OR to_regclass('public.saison') IS NULL
     OR to_regclass('public.project') IS NULL
     OR to_regclass('public.compte') IS NULL
     OR to_regclass('public.inscription_saison') IS NULL
     OR to_regclass('public.lien_groupe') IS NULL THEN
    RAISE EXCEPTION
      'Schéma de base Assolutions incomplet : annulation de la migration';
  END IF;
END $$;

ALTER TABLE public.groupes
  ADD COLUMN IF NOT EXISTS age_min integer NULL,
  ADD COLUMN IF NOT EXISTS age_max integer NULL,
  ADD COLUMN IF NOT EXISTS naissance_avant integer NULL,
  ADD COLUMN IF NOT EXISTS naissance_apres integer NULL,
  ADD COLUMN IF NOT EXISTS limit_nb integer NULL;

ALTER TABLE public.personne
  ADD COLUMN IF NOT EXISTS pays character varying(100) NULL;

UPDATE public.personne
SET pays = 'France'
WHERE pays IS NULL OR btrim(pays) = '';

ALTER TABLE public.personne
  ALTER COLUMN pays SET DEFAULT 'France';

ALTER TABLE public.document
  ADD COLUMN IF NOT EXISTS date_document date NULL,
  ADD COLUMN IF NOT EXISTS date_expiration date NULL,
  ADD COLUMN IF NOT EXISTS valide boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS medecin_nom character varying(150) NULL,
  ADD COLUMN IF NOT EXISTS medecin_rpps character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS mention_competition boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.tarif_inscription (
  id serial PRIMARY KEY,
  saison_id integer NOT NULL,
  nom character varying(255) NOT NULL,
  prix_centimes integer NOT NULL,
  date_debut_validite date NULL,
  date_fin_validite date NULL,
  reinscription boolean NOT NULL DEFAULT false,
  paiement_plusieurs_fois integer NOT NULL DEFAULT 1,
  age_min integer NULL,
  age_max integer NULL,
  naissance_avant integer NULL,
  naissance_apres integer NULL,
  limit_nb integer NULL,
  actif boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL
);

CREATE TABLE IF NOT EXISTS public.groupe_tarif_inscription (
  id serial PRIMARY KEY,
  groupe_id integer NOT NULL,
  tarif_inscription_id integer NOT NULL,
  CONSTRAINT groupe_tarif_inscription_groupe_id_tarif_inscription_id_key
    UNIQUE (groupe_id, tarif_inscription_id)
);

CREATE INDEX IF NOT EXISTS ix_tarif_inscription_saison
  ON public.tarif_inscription (saison_id, actif, ordre);
CREATE INDEX IF NOT EXISTS ix_groupe_tarif_inscription_groupe
  ON public.groupe_tarif_inscription (groupe_id);
CREATE INDEX IF NOT EXISTS ix_groupe_tarif_inscription_tarif
  ON public.groupe_tarif_inscription (tarif_inscription_id);

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
  updated_at timestamp without time zone NULL
);

CREATE TABLE IF NOT EXISTS public.code_promo_tarif (
  id serial PRIMARY KEY,
  code_promo_id integer NOT NULL,
  tarif_inscription_id integer NOT NULL,
  CONSTRAINT uq_code_promo_tarif UNIQUE (code_promo_id, tarif_inscription_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_code_promo_saison_code
  ON public.code_promo (saison_id, lower(btrim(code)));
CREATE INDEX IF NOT EXISTS ix_code_promo_project_saison
  ON public.code_promo (project_id, saison_id, actif);
CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_code
  ON public.code_promo_tarif (code_promo_id);
CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_tarif
  ON public.code_promo_tarif (tarif_inscription_id);

CREATE TABLE IF NOT EXISTS public.souscription (
  id serial PRIMARY KEY,
  saison_id integer NOT NULL,
  payeur_personne_id integer NULL,
  statut character varying(40) NOT NULL DEFAULT 'BROUILLON',
  montant_total_centimes integer NOT NULL DEFAULT 0,
  code_promo_id integer NULL,
  helloasso_checkout_intent_id integer NULL,
  helloasso_order_id integer NULL,
  helloasso_redirect_url text NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  paid_at timestamp without time zone NULL,
  project_id integer NULL,
  compte_id integer NULL,
  montant_initial_centimes integer NOT NULL DEFAULT 0,
  montant_remise_centimes integer NOT NULL DEFAULT 0,
  nb_echeances integer NOT NULL DEFAULT 1,
  code_promo_applique character varying(50) NULL,
  helloasso_payment_state character varying(80) NULL,
  finalized_at timestamp without time zone NULL,
  canceled_at timestamp without time zone NULL,
  error_message text NULL,
  payeur_prenom character varying(100) NULL,
  payeur_nom character varying(100) NULL,
  payeur_email character varying(250) NULL
);

CREATE TABLE IF NOT EXISTS public.souscription_personne (
  id serial PRIMARY KEY,
  souscription_id integer NOT NULL,
  personne_id integer NOT NULL,
  tarif_inscription_id integer NULL,
  prix_initial_centimes integer NULL,
  prix_final_centimes integer NULL,
  statut character varying(40) NOT NULL DEFAULT 'BROUILLON',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL,
  remise_centimes integer NOT NULL DEFAULT 0,
  inscription_saison_id integer NULL,
  donnees_personne_snapshot jsonb NULL,
  informations_validees_at timestamp without time zone NULL,
  dossier_complet boolean NOT NULL DEFAULT false,
  type_licence character varying(30) NOT NULL DEFAULT 'LOISIR'
);

CREATE TABLE IF NOT EXISTS public.souscription_personne_groupe (
  id serial PRIMARY KEY,
  souscription_personne_id integer NOT NULL,
  groupe_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT souscription_personne_groupe_souscription_personne_id_group_key
    UNIQUE (souscription_personne_id, groupe_id)
);

CREATE TABLE IF NOT EXISTS public.souscription_evenement (
  id bigserial PRIMARY KEY,
  souscription_id integer NOT NULL,
  type_evenement character varying(80) NOT NULL,
  details jsonb NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_souscription_compte_saison
  ON public.souscription (compte_id, saison_id, statut);
CREATE INDEX IF NOT EXISTS ix_souscription_checkout
  ON public.souscription (helloasso_checkout_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_un_brouillon_compte_saison
  ON public.souscription (compte_id, saison_id)
  WHERE statut = 'BROUILLON' AND compte_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_personne_unique
  ON public.souscription_personne (souscription_id, personne_id);
CREATE INDEX IF NOT EXISTS ix_souscription_personne_personne
  ON public.souscription_personne (personne_id);
CREATE INDEX IF NOT EXISTS ix_souscription_personne_tarif
  ON public.souscription_personne (tarif_inscription_id);
CREATE INDEX IF NOT EXISTS ix_souscription_evenement_souscription
  ON public.souscription_evenement (souscription_id, created_at);

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
  updated_at timestamp without time zone NULL
);

CREATE TABLE IF NOT EXISTS public.exigence_dossier_portee (
  id serial PRIMARY KEY,
  exigence_id integer NOT NULL,
  type_portee character varying(30) NOT NULL,
  cible_id integer NULL,
  cible_code character varying(100) NULL
);

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
  updated_at timestamp without time zone NULL
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
  CONSTRAINT uq_dossier_personne_saison
    UNIQUE (project_id, saison_id, personne_id)
);

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
  updated_at timestamp without time zone NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_project_saison_code
  ON public.exigence_dossier (
    project_id,
    COALESCE(saison_id, 0),
    lower(btrim(code))
  );
CREATE INDEX IF NOT EXISTS ix_exigence_dossier_project_saison
  ON public.exigence_dossier (project_id, saison_id, usage, actif, ordre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_portee
  ON public.exigence_dossier_portee (
    exigence_id,
    type_portee,
    COALESCE(cible_id, 0),
    COALESCE(lower(btrim(cible_code)), '')
  );
CREATE INDEX IF NOT EXISTS ix_exigence_dossier_portee_exigence
  ON public.exigence_dossier_portee (exigence_id);
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
CREATE INDEX IF NOT EXISTS ix_dossier_personne_saison_personne
  ON public.dossier_personne_saison (personne_id, saison_id);
CREATE INDEX IF NOT EXISTS ix_preuve_medicale_personne
  ON public.preuve_medicale (project_id, personne_id, date_document DESC);
CREATE INDEX IF NOT EXISTS ix_preuve_medicale_saison
  ON public.preuve_medicale (project_id, saison_id, personne_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tarif_inscription_prix') THEN
    ALTER TABLE public.tarif_inscription ADD CONSTRAINT ck_tarif_inscription_prix CHECK (prix_centimes >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tarif_inscription_echeances') THEN
    ALTER TABLE public.tarif_inscription ADD CONSTRAINT ck_tarif_inscription_echeances CHECK (paiement_plusieurs_fois BETWEEN 1 AND 12);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tarif_inscription_dates') THEN
    ALTER TABLE public.tarif_inscription ADD CONSTRAINT ck_tarif_inscription_dates CHECK (date_debut_validite IS NULL OR date_fin_validite IS NULL OR date_debut_validite <= date_fin_validite);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_type') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_type CHECK (type_remise IN ('POURCENTAGE', 'MONTANT'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_valeur') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_valeur CHECK (valeur > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_dates') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_dates CHECK (date_debut IS NULL OR date_fin IS NULL OR date_debut <= date_fin);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_limite') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_limite CHECK (limit_nb IS NULL OR limit_nb > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_minimum') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_minimum CHECK (montant_min_centimes IS NULL OR montant_min_centimes >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_code_promo_maximum') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT ck_code_promo_maximum CHECK (max_remise_centimes IS NULL OR max_remise_centimes > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_montants') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT ck_souscription_montants CHECK (montant_initial_centimes >= 0 AND montant_remise_centimes >= 0 AND montant_total_centimes >= 0 AND montant_total_centimes = montant_initial_centimes - montant_remise_centimes);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_echeances') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT ck_souscription_echeances CHECK (nb_echeances BETWEEN 1 AND 12);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_personne_montants') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT ck_souscription_personne_montants CHECK (prix_initial_centimes >= 0 AND remise_centimes >= 0 AND prix_final_centimes >= 0 AND prix_final_centimes = prix_initial_centimes - remise_centimes);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_souscription_personne_type_licence') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT ck_souscription_personne_type_licence CHECK (type_licence IN ('LOISIR', 'COMPETITION'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_usage') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT ck_exigence_dossier_usage CHECK (usage IN ('INSCRIPTION', 'LICENCE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_type') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT ck_exigence_dossier_type CHECK (type_exigence IN ('CHAMP_PERSONNE', 'CONTACT', 'DOCUMENT', 'PREUVE_MEDICALE', 'CONSENTEMENT', 'DECLARATION'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_reponse') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT ck_exigence_dossier_reponse CHECK (type_reponse IN ('AUCUNE', 'BOOLEEN', 'TEXTE', 'DATE', 'DOCUMENT'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_ages') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT ck_exigence_dossier_ages CHECK ((age_min IS NULL OR age_min >= 0) AND (age_max IS NULL OR age_max >= 0) AND (age_min IS NULL OR age_max IS NULL OR age_min <= age_max));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_validite') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT ck_exigence_dossier_validite CHECK (validite_mois IS NULL OR validite_mois > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_portee_type') THEN
    ALTER TABLE public.exigence_dossier_portee ADD CONSTRAINT ck_exigence_dossier_portee_type CHECK (type_portee IN ('GENERAL', 'GROUPE', 'TARIF', 'TYPE_LICENCE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_exigence_dossier_portee_cible') THEN
    ALTER TABLE public.exigence_dossier_portee ADD CONSTRAINT ck_exigence_dossier_portee_cible CHECK ((type_portee = 'GENERAL' AND cible_id IS NULL AND cible_code IS NULL) OR (type_portee IN ('GROUPE', 'TARIF') AND cible_id IS NOT NULL AND cible_code IS NULL) OR (type_portee = 'TYPE_LICENCE' AND cible_id IS NULL AND cible_code IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_reponse_exigence_contexte') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT ck_reponse_exigence_contexte CHECK (contexte_type IN ('SAISON', 'SOUSCRIPTION', 'LICENCE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dossier_personne_type_licence') THEN
    ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT ck_dossier_personne_type_licence CHECK (type_licence IN ('LOISIR', 'COMPETITION'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_preuve_medicale_type') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT ck_preuve_medicale_type CHECK (type_preuve IN ('CERTIFICAT', 'QS_SPORT'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_preuve_medicale_certificat') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT ck_preuve_medicale_certificat CHECK (type_preuve <> 'CERTIFICAT' OR (medecin_nom IS NOT NULL AND btrim(medecin_nom) <> '' AND medecin_rpps IS NOT NULL AND btrim(medecin_rpps) <> ''));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_preuve_medicale_qs') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT ck_preuve_medicale_qs CHECK (type_preuve <> 'QS_SPORT' OR qs_reponses_negatives IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tarif_inscription_saison') THEN
    ALTER TABLE public.tarif_inscription ADD CONSTRAINT fk_tarif_inscription_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_groupe_tarif_inscription_groupe') THEN
    ALTER TABLE public.groupe_tarif_inscription ADD CONSTRAINT fk_groupe_tarif_inscription_groupe FOREIGN KEY (groupe_id) REFERENCES public.groupes(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_groupe_tarif_inscription_tarif') THEN
    ALTER TABLE public.groupe_tarif_inscription ADD CONSTRAINT fk_groupe_tarif_inscription_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_project') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT fk_code_promo_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_saison') THEN
    ALTER TABLE public.code_promo ADD CONSTRAINT fk_code_promo_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_tarif_code') THEN
    ALTER TABLE public.code_promo_tarif ADD CONSTRAINT fk_code_promo_tarif_code FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_code_promo_tarif_tarif') THEN
    ALTER TABLE public.code_promo_tarif ADD CONSTRAINT fk_code_promo_tarif_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_saison') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_compte') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_compte FOREIGN KEY (compte_id) REFERENCES public.compte(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_payeur') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_payeur FOREIGN KEY (payeur_personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_code_promo') THEN
    ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_code_promo FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_souscription') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_souscription FOREIGN KEY (souscription_id) REFERENCES public.souscription(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_personne') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_tarif') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_inscription_saison') THEN
    ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_inscription_saison FOREIGN KEY (inscription_saison_id) REFERENCES public.inscription_saison(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_groupe_ligne') THEN
    ALTER TABLE public.souscription_personne_groupe ADD CONSTRAINT fk_souscription_personne_groupe_ligne FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_personne_groupe_groupe') THEN
    ALTER TABLE public.souscription_personne_groupe ADD CONSTRAINT fk_souscription_personne_groupe_groupe FOREIGN KEY (groupe_id) REFERENCES public.groupes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_souscription_evenement_souscription') THEN
    ALTER TABLE public.souscription_evenement ADD CONSTRAINT fk_souscription_evenement_souscription FOREIGN KEY (souscription_id) REFERENCES public.souscription(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_dossier_project') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT fk_exigence_dossier_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_dossier_saison') THEN
    ALTER TABLE public.exigence_dossier ADD CONSTRAINT fk_exigence_dossier_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exigence_portee_exigence') THEN
    ALTER TABLE public.exigence_dossier_portee ADD CONSTRAINT fk_exigence_portee_exigence FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_exigence') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_exigence FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_personne') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_saison') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_souscription_personne') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_souscription_personne FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_document') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_document FOREIGN KEY (document_id) REFERENCES public.document(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reponse_exigence_repondant') THEN
    ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_repondant FOREIGN KEY (repondu_par_personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_project') THEN
    ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_saison') THEN
    ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dossier_personne_personne') THEN
    ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_project') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_personne') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_saison') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuve_medicale_document') THEN
    ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_document FOREIGN KEY (document_id) REFERENCES public.document(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO public.exigence_dossier (project_id, saison_id, code, libelle, description, usage, type_exigence, source_code, type_reponse, obligatoire, bloquante, ordre, actif, texte_consentement, version_texte)
SELECT s.project_id, s.id, 'PHOTO_PRESENTE', 'Photo de la personne', 'Indique si une photo est déjà enregistrée dans la fiche adhérent.', 'LICENCE', 'DOCUMENT', 'PHOTO', 'DOCUMENT', false, false, 10, true, NULL, NULL
FROM public.saison s
WHERE s.active = true
  AND NOT EXISTS (SELECT 1 FROM public.exigence_dossier e WHERE e.project_id = s.project_id AND COALESCE(e.saison_id, 0) = s.id AND upper(btrim(e.code)) = 'PHOTO_PRESENTE');

INSERT INTO public.exigence_dossier (project_id, saison_id, code, libelle, description, usage, type_exigence, source_code, type_reponse, obligatoire, bloquante, ordre, actif, texte_consentement, version_texte)
SELECT s.project_id, s.id, 'DROIT_IMAGE', 'Droit à l''image', 'La personne doit répondre oui ou non. Un refus reste une réponse valide.', 'LICENCE', 'CONSENTEMENT', NULL, 'BOOLEEN', true, false, 20, true, 'J''autorise l''utilisation de mon image dans le cadre des activités et de la communication de l''association.', '2026-01'
FROM public.saison s
WHERE s.active = true
  AND NOT EXISTS (SELECT 1 FROM public.exigence_dossier e WHERE e.project_id = s.project_id AND COALESCE(e.saison_id, 0) = s.id AND upper(replace(btrim(e.code), ' ', '_')) IN ('DROIT_IMAGE', 'DROIT_A_L_IMAGE', 'DROIT_A_IMAGE'));

INSERT INTO public.exigence_dossier (project_id, saison_id, code, libelle, description, usage, type_exigence, source_code, type_reponse, obligatoire, bloquante, ordre, actif, texte_consentement, version_texte)
SELECT s.project_id, s.id, 'PREUVE_MEDICALE', 'Situation médicale', 'Questionnaire de santé de la saison ou certificat médical.', 'LICENCE', 'PREUVE_MEDICALE', NULL, 'AUCUNE', true, false, 30, true, NULL, NULL
FROM public.saison s
WHERE s.active = true
  AND NOT EXISTS (SELECT 1 FROM public.exigence_dossier e WHERE e.project_id = s.project_id AND COALESCE(e.saison_id, 0) = s.id AND e.type_exigence = 'PREUVE_MEDICALE');

INSERT INTO public.exigence_dossier_portee (exigence_id, type_portee, cible_id, cible_code)
SELECT e.id, 'GENERAL', NULL, NULL
FROM public.exigence_dossier e
JOIN public.saison s ON s.id = e.saison_id AND s.active = true
WHERE upper(btrim(e.code)) IN ('PHOTO_PRESENTE', 'DROIT_IMAGE', 'PREUVE_MEDICALE')
  AND NOT EXISTS (SELECT 1 FROM public.exigence_dossier_portee p WHERE p.exigence_id = e.id);

COMMIT;

SELECT 'tarif_inscription' AS objet, to_regclass('public.tarif_inscription') IS NOT NULL AS present
UNION ALL SELECT 'souscription', to_regclass('public.souscription') IS NOT NULL
UNION ALL SELECT 'exigence_dossier', to_regclass('public.exigence_dossier') IS NOT NULL
UNION ALL SELECT 'preuve_medicale', to_regclass('public.preuve_medicale') IS NOT NULL;
