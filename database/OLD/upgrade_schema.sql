/*
  Assolutions - alignement de schéma PROD / PREPROD
  ==================================================
  Généré le 2026-08-16 à partir des schémas fournis :
    - schema_prod.sql
    - schema_pre_prod.sql

  Objectif :
    - un seul script SQL exécutable depuis pgAdmin ;
    - additif et idempotent ;
    - aucune donnée métier supprimée ;
    - aucune donnée de paramétrage (tarifs, exigences, groupes, cours) injectée ici :
      ces données seront réimportées séparément.

  Le script peut être exécuté sur la PREPROD puis sur la PROD.
  Il ajoute aussi tarif_inscription.compte_bancaire_id, attendu par le code actuel
  mais absent du dump PREPROD fourni.

  Recommandation : faire un backup avant exécution en production.
*/

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '0';

/* 0. Vérification du socle historique */
DO $$
BEGIN
  IF to_regclass('public.personne') IS NULL
     OR to_regclass('public.groupes') IS NULL
     OR to_regclass('public.document') IS NULL
     OR to_regclass('public.saison') IS NULL
     OR to_regclass('public.project') IS NULL
     OR to_regclass('public.compte') IS NULL
     OR to_regclass('public.compte_bancaire') IS NULL
     OR to_regclass('public.inscription_saison') IS NULL
     OR to_regclass('public.lien_groupe') IS NULL THEN
    RAISE EXCEPTION 'Schéma Assolutions de base incomplet : migration annulée.';
  END IF;
END $$;

/* 1. Colonnes ajoutées aux tables historiques */
ALTER TABLE public.groupes
  ADD COLUMN IF NOT EXISTS age_min integer,
  ADD COLUMN IF NOT EXISTS age_max integer,
  ADD COLUMN IF NOT EXISTS naissance_avant integer,
  ADD COLUMN IF NOT EXISTS naissance_apres integer,
  ADD COLUMN IF NOT EXISTS limit_nb integer;

ALTER TABLE public.personne
  ADD COLUMN IF NOT EXISTS pays character varying(100);

UPDATE public.personne
SET pays = 'France'
WHERE pays IS NULL OR btrim(pays) = '';

ALTER TABLE public.personne
  ALTER COLUMN pays SET DEFAULT 'France';

ALTER TABLE public.document
  ADD COLUMN IF NOT EXISTS date_document date,
  ADD COLUMN IF NOT EXISTS date_expiration date,
  ADD COLUMN IF NOT EXISTS valide boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS medecin_nom character varying(150),
  ADD COLUMN IF NOT EXISTS medecin_rpps character varying(20),
  ADD COLUMN IF NOT EXISTS mention_competition boolean NOT NULL DEFAULT false;

/* 2. Tarifs et groupes */
CREATE TABLE IF NOT EXISTS public.tarif_inscription (
  id serial PRIMARY KEY,
  saison_id integer NOT NULL,
  nom character varying(255) NOT NULL,
  prix_centimes integer NOT NULL,
  date_debut_validite date,
  date_fin_validite date,
  reinscription boolean NOT NULL DEFAULT false,
  paiement_plusieurs_fois integer NOT NULL DEFAULT 1,
  age_min integer,
  age_max integer,
  naissance_avant integer,
  naissance_apres integer,
  limit_nb integer,
  actif boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT ck_tarif_inscription_dates CHECK (date_debut_validite IS NULL OR date_fin_validite IS NULL OR date_debut_validite <= date_fin_validite),
  CONSTRAINT ck_tarif_inscription_echeances CHECK (paiement_plusieurs_fois BETWEEN 1 AND 12),
  CONSTRAINT ck_tarif_inscription_prix CHECK (prix_centimes >= 0)
);

ALTER TABLE public.tarif_inscription
  ADD COLUMN IF NOT EXISTS compte_bancaire_id integer;

CREATE TABLE IF NOT EXISTS public.groupe_tarif_inscription (
  id serial PRIMARY KEY,
  groupe_id integer NOT NULL,
  tarif_inscription_id integer NOT NULL,
  CONSTRAINT groupe_tarif_inscription_groupe_id_tarif_inscription_id_key UNIQUE (groupe_id, tarif_inscription_id)
);

/* 3. Codes promo */
CREATE TABLE IF NOT EXISTS public.code_promo (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NOT NULL,
  code character varying(50) NOT NULL,
  libelle character varying(150) NOT NULL,
  type_remise character varying(20) NOT NULL,
  valeur integer NOT NULL,
  montant_min_centimes integer,
  max_remise_centimes integer,
  date_debut date,
  date_fin date,
  limit_nb integer,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT ck_code_promo_dates CHECK (date_debut IS NULL OR date_fin IS NULL OR date_debut <= date_fin),
  CONSTRAINT ck_code_promo_limite CHECK (limit_nb IS NULL OR limit_nb > 0),
  CONSTRAINT ck_code_promo_maximum CHECK (max_remise_centimes IS NULL OR max_remise_centimes > 0),
  CONSTRAINT ck_code_promo_minimum CHECK (montant_min_centimes IS NULL OR montant_min_centimes >= 0),
  CONSTRAINT ck_code_promo_type CHECK (type_remise IN ('POURCENTAGE', 'MONTANT')),
  CONSTRAINT ck_code_promo_valeur CHECK (valeur > 0)
);

CREATE TABLE IF NOT EXISTS public.code_promo_tarif (
  id serial PRIMARY KEY,
  code_promo_id integer NOT NULL,
  tarif_inscription_id integer NOT NULL,
  CONSTRAINT uq_code_promo_tarif UNIQUE (code_promo_id, tarif_inscription_id)
);

/* 4. Tunnel de souscription */
CREATE TABLE IF NOT EXISTS public.souscription (
  id serial PRIMARY KEY,
  saison_id integer NOT NULL,
  payeur_personne_id integer,
  statut character varying(40) NOT NULL DEFAULT 'BROUILLON',
  montant_total_centimes integer NOT NULL DEFAULT 0,
  code_promo_id integer,
  helloasso_checkout_intent_id integer,
  helloasso_order_id integer,
  helloasso_redirect_url text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  paid_at timestamp without time zone,
  project_id integer,
  compte_id integer,
  montant_initial_centimes integer NOT NULL DEFAULT 0,
  montant_remise_centimes integer NOT NULL DEFAULT 0,
  nb_echeances integer NOT NULL DEFAULT 1,
  code_promo_applique character varying(50),
  helloasso_payment_state character varying(80),
  finalized_at timestamp without time zone,
  canceled_at timestamp without time zone,
  error_message text,
  payeur_prenom character varying(100),
  payeur_nom character varying(100),
  payeur_email character varying(250),
  CONSTRAINT ck_souscription_echeances CHECK (nb_echeances BETWEEN 1 AND 12),
  CONSTRAINT ck_souscription_montants CHECK (
    montant_initial_centimes >= 0
    AND montant_remise_centimes >= 0
    AND montant_total_centimes >= 0
    AND montant_total_centimes = montant_initial_centimes - montant_remise_centimes
  )
);

CREATE TABLE IF NOT EXISTS public.souscription_personne (
  id serial PRIMARY KEY,
  souscription_id integer NOT NULL,
  personne_id integer NOT NULL,
  tarif_inscription_id integer,
  prix_initial_centimes integer,
  prix_final_centimes integer,
  statut character varying(40) NOT NULL DEFAULT 'BROUILLON',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  remise_centimes integer NOT NULL DEFAULT 0,
  inscription_saison_id integer,
  donnees_personne_snapshot jsonb,
  informations_validees_at timestamp without time zone,
  dossier_complet boolean NOT NULL DEFAULT false,
  type_licence character varying(30) NOT NULL DEFAULT 'LOISIR',
  CONSTRAINT ck_souscription_personne_montants CHECK (
    prix_initial_centimes >= 0
    AND remise_centimes >= 0
    AND prix_final_centimes >= 0
    AND prix_final_centimes = prix_initial_centimes - remise_centimes
  ),
  CONSTRAINT ck_souscription_personne_type_licence CHECK (type_licence IN ('LOISIR', 'COMPETITION'))
);

CREATE TABLE IF NOT EXISTS public.souscription_personne_groupe (
  id serial PRIMARY KEY,
  souscription_personne_id integer NOT NULL,
  groupe_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT souscription_personne_groupe_souscription_personne_id_group_key UNIQUE (souscription_personne_id, groupe_id)
);

CREATE TABLE IF NOT EXISTS public.souscription_evenement (
  id bigserial PRIMARY KEY,
  souscription_id integer NOT NULL,
  type_evenement character varying(80) NOT NULL,
  details jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

/* 5. Exigences de dossier et médical */
CREATE TABLE IF NOT EXISTS public.exigence_dossier (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer,
  code character varying(80) NOT NULL,
  libelle character varying(255) NOT NULL,
  description text,
  usage character varying(20) NOT NULL DEFAULT 'INSCRIPTION',
  type_exigence character varying(30) NOT NULL,
  source_code character varying(100),
  type_reponse character varying(20) NOT NULL DEFAULT 'AUCUNE',
  obligatoire boolean NOT NULL DEFAULT true,
  bloquante boolean NOT NULL DEFAULT true,
  age_min integer,
  age_max integer,
  validite_mois integer,
  texte_consentement text,
  version_texte character varying(40),
  ordre integer NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT ck_exigence_dossier_ages CHECK (
    (age_min IS NULL OR age_min >= 0)
    AND (age_max IS NULL OR age_max >= 0)
    AND (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
  ),
  CONSTRAINT ck_exigence_dossier_reponse CHECK (type_reponse IN ('AUCUNE', 'BOOLEEN', 'TEXTE', 'DATE', 'DOCUMENT')),
  CONSTRAINT ck_exigence_dossier_type CHECK (type_exigence IN ('CHAMP_PERSONNE', 'CONTACT', 'DOCUMENT', 'PREUVE_MEDICALE', 'CONSENTEMENT', 'DECLARATION')),
  CONSTRAINT ck_exigence_dossier_usage CHECK (usage IN ('INSCRIPTION', 'LICENCE')),
  CONSTRAINT ck_exigence_dossier_validite CHECK (validite_mois IS NULL OR validite_mois > 0)
);

CREATE TABLE IF NOT EXISTS public.exigence_dossier_portee (
  id serial PRIMARY KEY,
  exigence_id integer NOT NULL,
  type_portee character varying(30) NOT NULL,
  cible_id integer,
  cible_code character varying(100),
  CONSTRAINT ck_exigence_dossier_portee_cible CHECK (
    (type_portee = 'GENERAL' AND cible_id IS NULL AND cible_code IS NULL)
    OR (type_portee IN ('GROUPE', 'TARIF') AND cible_id IS NOT NULL AND cible_code IS NULL)
    OR (type_portee = 'TYPE_LICENCE' AND cible_id IS NULL AND cible_code IS NOT NULL)
  ),
  CONSTRAINT ck_exigence_dossier_portee_type CHECK (type_portee IN ('GENERAL', 'GROUPE', 'TARIF', 'TYPE_LICENCE'))
);

CREATE TABLE IF NOT EXISTS public.reponse_exigence_dossier (
  id bigserial PRIMARY KEY,
  exigence_id integer NOT NULL,
  personne_id integer NOT NULL,
  saison_id integer NOT NULL,
  souscription_personne_id integer,
  contexte_type character varying(30) NOT NULL DEFAULT 'SAISON',
  contexte_id integer,
  valeur_boolean boolean,
  valeur_texte text,
  valeur_date date,
  document_id integer,
  texte_accepte text,
  version_acceptee character varying(40),
  repondu_par_personne_id integer,
  date_reponse timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT ck_reponse_exigence_contexte CHECK (contexte_type IN ('SAISON', 'SOUSCRIPTION', 'LICENCE'))
);

CREATE TABLE IF NOT EXISTS public.dossier_personne_saison (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  saison_id integer NOT NULL,
  personne_id integer NOT NULL,
  type_licence character varying(30) NOT NULL DEFAULT 'LOISIR',
  informations_validees_at timestamp without time zone,
  donnees_personne_snapshot jsonb,
  inscription_complete boolean NOT NULL DEFAULT false,
  licence_eligible boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT uq_dossier_personne_saison UNIQUE (project_id, saison_id, personne_id),
  CONSTRAINT ck_dossier_personne_type_licence CHECK (type_licence IN ('LOISIR', 'COMPETITION'))
);

CREATE TABLE IF NOT EXISTS public.preuve_medicale (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  personne_id integer NOT NULL,
  saison_id integer NOT NULL,
  type_preuve character varying(30) NOT NULL,
  date_document date NOT NULL,
  qs_reponses_negatives boolean,
  valable_competition boolean NOT NULL DEFAULT false,
  medecin_nom character varying(150),
  medecin_rpps character varying(20),
  document_id integer,
  valide boolean NOT NULL DEFAULT true,
  commentaire text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT ck_preuve_medicale_certificat CHECK (
    type_preuve <> 'CERTIFICAT'
    OR (
      medecin_nom IS NOT NULL AND btrim(medecin_nom) <> ''
      AND medecin_rpps IS NOT NULL AND btrim(medecin_rpps) <> ''
    )
  ),
  CONSTRAINT ck_preuve_medicale_qs CHECK (type_preuve <> 'QS_SPORT' OR qs_reponses_negatives IS NOT NULL),
  CONSTRAINT ck_preuve_medicale_type CHECK (type_preuve IN ('CERTIFICAT', 'QS_SPORT'))
);

/* 6. Index */
CREATE INDEX IF NOT EXISTS ix_tarif_inscription_saison ON public.tarif_inscription (saison_id, actif, ordre);
CREATE INDEX IF NOT EXISTS idx_tarif_inscription_compte_bancaire ON public.tarif_inscription (compte_bancaire_id);
CREATE INDEX IF NOT EXISTS ix_groupe_tarif_inscription_groupe ON public.groupe_tarif_inscription (groupe_id);
CREATE INDEX IF NOT EXISTS ix_groupe_tarif_inscription_tarif ON public.groupe_tarif_inscription (tarif_inscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_code_promo_saison_code ON public.code_promo (saison_id, lower(btrim(code)));
CREATE INDEX IF NOT EXISTS ix_code_promo_project_saison ON public.code_promo (project_id, saison_id, actif);
CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_code ON public.code_promo_tarif (code_promo_id);
CREATE INDEX IF NOT EXISTS ix_code_promo_tarif_tarif ON public.code_promo_tarif (tarif_inscription_id);
CREATE INDEX IF NOT EXISTS ix_souscription_compte_saison ON public.souscription (compte_id, saison_id, statut);
CREATE INDEX IF NOT EXISTS ix_souscription_checkout ON public.souscription (helloasso_checkout_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_un_brouillon_compte_saison ON public.souscription (compte_id, saison_id) WHERE statut = 'BROUILLON' AND compte_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_souscription_personne_unique ON public.souscription_personne (souscription_id, personne_id);
CREATE INDEX IF NOT EXISTS ix_souscription_personne_personne ON public.souscription_personne (personne_id);
CREATE INDEX IF NOT EXISTS ix_souscription_personne_tarif ON public.souscription_personne (tarif_inscription_id);
CREATE INDEX IF NOT EXISTS ix_souscription_evenement_souscription ON public.souscription_evenement (souscription_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_project_saison_code ON public.exigence_dossier (project_id, COALESCE(saison_id, 0), lower(btrim(code)));
CREATE INDEX IF NOT EXISTS ix_exigence_dossier_project_saison ON public.exigence_dossier (project_id, saison_id, usage, actif, ordre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exigence_dossier_portee ON public.exigence_dossier_portee (exigence_id, type_portee, COALESCE(cible_id, 0), COALESCE(lower(btrim(cible_code)), ''));
CREATE INDEX IF NOT EXISTS ix_exigence_dossier_portee_exigence ON public.exigence_dossier_portee (exigence_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reponse_exigence_saison_personne ON public.reponse_exigence_dossier (exigence_id, personne_id, saison_id, contexte_type, COALESCE(contexte_id, 0));
CREATE INDEX IF NOT EXISTS ix_reponse_exigence_personne_saison ON public.reponse_exigence_dossier (personne_id, saison_id);
CREATE INDEX IF NOT EXISTS ix_dossier_personne_saison_personne ON public.dossier_personne_saison (personne_id, saison_id);
CREATE INDEX IF NOT EXISTS ix_preuve_medicale_personne ON public.preuve_medicale (project_id, personne_id, date_document DESC);
CREATE INDEX IF NOT EXISTS ix_preuve_medicale_saison ON public.preuve_medicale (project_id, saison_id, personne_id);

/* 7. Clés étrangères */
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('fk_tarif_inscription_saison', 'ALTER TABLE public.tarif_inscription ADD CONSTRAINT fk_tarif_inscription_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_tarif_inscription_compte_bancaire', 'ALTER TABLE public.tarif_inscription ADD CONSTRAINT fk_tarif_inscription_compte_bancaire FOREIGN KEY (compte_bancaire_id) REFERENCES public.compte_bancaire(id) ON DELETE SET NULL'),
      ('fk_groupe_tarif_inscription_groupe', 'ALTER TABLE public.groupe_tarif_inscription ADD CONSTRAINT fk_groupe_tarif_inscription_groupe FOREIGN KEY (groupe_id) REFERENCES public.groupes(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_groupe_tarif_inscription_tarif', 'ALTER TABLE public.groupe_tarif_inscription ADD CONSTRAINT fk_groupe_tarif_inscription_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_code_promo_project', 'ALTER TABLE public.code_promo ADD CONSTRAINT fk_code_promo_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_code_promo_saison', 'ALTER TABLE public.code_promo ADD CONSTRAINT fk_code_promo_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_code_promo_tarif_code', 'ALTER TABLE public.code_promo_tarif ADD CONSTRAINT fk_code_promo_tarif_code FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_code_promo_tarif_tarif', 'ALTER TABLE public.code_promo_tarif ADD CONSTRAINT fk_code_promo_tarif_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_souscription_saison', 'ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_compte', 'ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_compte FOREIGN KEY (compte_id) REFERENCES public.compte(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_payeur', 'ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_payeur FOREIGN KEY (payeur_personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_code_promo', 'ALTER TABLE public.souscription ADD CONSTRAINT fk_souscription_code_promo FOREIGN KEY (code_promo_id) REFERENCES public.code_promo(id) ON UPDATE CASCADE ON DELETE SET NULL'),
      ('fk_souscription_personne_souscription', 'ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_souscription FOREIGN KEY (souscription_id) REFERENCES public.souscription(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_souscription_personne_personne', 'ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_personne_tarif', 'ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_tarif FOREIGN KEY (tarif_inscription_id) REFERENCES public.tarif_inscription(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_personne_inscription_saison', 'ALTER TABLE public.souscription_personne ADD CONSTRAINT fk_souscription_personne_inscription_saison FOREIGN KEY (inscription_saison_id) REFERENCES public.inscription_saison(id) ON UPDATE CASCADE ON DELETE SET NULL'),
      ('fk_souscription_personne_groupe_ligne', 'ALTER TABLE public.souscription_personne_groupe ADD CONSTRAINT fk_souscription_personne_groupe_ligne FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_souscription_personne_groupe_groupe', 'ALTER TABLE public.souscription_personne_groupe ADD CONSTRAINT fk_souscription_personne_groupe_groupe FOREIGN KEY (groupe_id) REFERENCES public.groupes(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
      ('fk_souscription_evenement_souscription', 'ALTER TABLE public.souscription_evenement ADD CONSTRAINT fk_souscription_evenement_souscription FOREIGN KEY (souscription_id) REFERENCES public.souscription(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_exigence_dossier_project', 'ALTER TABLE public.exigence_dossier ADD CONSTRAINT fk_exigence_dossier_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_exigence_dossier_saison', 'ALTER TABLE public.exigence_dossier ADD CONSTRAINT fk_exigence_dossier_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_exigence_portee_exigence', 'ALTER TABLE public.exigence_dossier_portee ADD CONSTRAINT fk_exigence_portee_exigence FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_reponse_exigence_exigence', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_exigence FOREIGN KEY (exigence_id) REFERENCES public.exigence_dossier(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_reponse_exigence_personne', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_reponse_exigence_saison', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_reponse_exigence_souscription_personne', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_souscription_personne FOREIGN KEY (souscription_personne_id) REFERENCES public.souscription_personne(id) ON UPDATE CASCADE ON DELETE SET NULL'),
      ('fk_reponse_exigence_document', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_document FOREIGN KEY (document_id) REFERENCES public.document(id) ON UPDATE CASCADE ON DELETE SET NULL'),
      ('fk_reponse_exigence_repondant', 'ALTER TABLE public.reponse_exigence_dossier ADD CONSTRAINT fk_reponse_exigence_repondant FOREIGN KEY (repondu_par_personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE SET NULL'),
      ('fk_dossier_personne_project', 'ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_dossier_personne_saison', 'ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_dossier_personne_personne', 'ALTER TABLE public.dossier_personne_saison ADD CONSTRAINT fk_dossier_personne_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_preuve_medicale_project', 'ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_project FOREIGN KEY (project_id) REFERENCES public.project(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_preuve_medicale_personne', 'ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_personne FOREIGN KEY (personne_id) REFERENCES public.personne(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_preuve_medicale_saison', 'ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_saison FOREIGN KEY (saison_id) REFERENCES public.saison(id) ON UPDATE CASCADE ON DELETE CASCADE'),
      ('fk_preuve_medicale_document', 'ALTER TABLE public.preuve_medicale ADD CONSTRAINT fk_preuve_medicale_document FOREIGN KEY (document_id) REFERENCES public.document(id) ON UPDATE CASCADE ON DELETE SET NULL')
    ) AS v(constraint_name, ddl)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.constraint_name) THEN
      EXECUTE r.ddl;
    END IF;
  END LOOP;
END $$;

/* 8. Compatibilité photo fiche adhérent / dossier */
CREATE OR REPLACE FUNCTION public.sync_photo_member_vers_dossier()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_objet_id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF lower(btrim(OLD.typedoc)) = 'photo'
       AND lower(btrim(OLD.objet_type)) = 'member' THEN
      DELETE FROM public.document
      WHERE objet_id = OLD.objet_id
        AND lower(btrim(objet_type)) = 'rider'
        AND lower(btrim(typedoc)) = 'photo'
        AND commentaire = 'MIROIR_PHOTO_MEMBER';
    END IF;
    RETURN OLD;
  END IF;

  IF lower(btrim(NEW.typedoc)) <> 'photo'
     OR lower(btrim(NEW.objet_type)) <> 'member' THEN
    RETURN NEW;
  END IF;

  v_objet_id := NEW.objet_id;

  DELETE FROM public.document
  WHERE objet_id = v_objet_id
    AND lower(btrim(objet_type)) = 'rider'
    AND lower(btrim(typedoc)) = 'photo'
    AND commentaire = 'MIROIR_PHOTO_MEMBER';

  INSERT INTO public.document (
    titre, objet_id, objet_type, typedoc, file_data, file_path, storage_type,
    mimetype, date_import, date_document, date_expiration, valide, commentaire,
    auteur, project_id
  ) VALUES (
    COALESCE(NEW.titre, 'Photo'), NEW.objet_id, 'rider', 'photo', NEW.file_data,
    NEW.file_path, NEW.storage_type, NEW.mimetype, COALESCE(NEW.date_import, now()),
    NEW.date_document, NEW.date_expiration, COALESCE(NEW.valide, true),
    'MIROIR_PHOTO_MEMBER', NEW.auteur, NEW.project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_photo_member_vers_dossier ON public.document;
CREATE TRIGGER trg_sync_photo_member_vers_dossier
AFTER INSERT OR DELETE OR UPDATE ON public.document
FOR EACH ROW EXECUTE FUNCTION public.sync_photo_member_vers_dossier();

/* Backfill technique des photos historiques. */
DELETE FROM public.document
WHERE lower(btrim(objet_type)) = 'rider'
  AND lower(btrim(typedoc)) = 'photo'
  AND commentaire = 'MIROIR_PHOTO_MEMBER';

INSERT INTO public.document (
  titre, objet_id, objet_type, typedoc, file_data, file_path, storage_type,
  mimetype, date_import, date_document, date_expiration, valide, commentaire,
  auteur, project_id
)
SELECT
  COALESCE(d.titre, 'Photo'), d.objet_id, 'rider', 'photo', d.file_data,
  d.file_path, d.storage_type, d.mimetype, d.date_import, d.date_document,
  d.date_expiration, COALESCE(d.valide, true), 'MIROIR_PHOTO_MEMBER',
  d.auteur, d.project_id
FROM public.document d
WHERE lower(btrim(d.objet_type)) = 'member'
  AND lower(btrim(d.typedoc)) = 'photo'
  AND NOT EXISTS (
    SELECT 1 FROM public.document existing
    WHERE existing.objet_id = d.objet_id
      AND lower(btrim(existing.objet_type)) = 'rider'
      AND lower(btrim(existing.typedoc)) = 'photo'
  );

/* 9. Contrôle final */
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.tarif_inscription') IS NULL THEN missing := array_append(missing, 'tarif_inscription'); END IF;
  IF to_regclass('public.groupe_tarif_inscription') IS NULL THEN missing := array_append(missing, 'groupe_tarif_inscription'); END IF;
  IF to_regclass('public.souscription') IS NULL THEN missing := array_append(missing, 'souscription'); END IF;
  IF to_regclass('public.souscription_personne') IS NULL THEN missing := array_append(missing, 'souscription_personne'); END IF;
  IF to_regclass('public.exigence_dossier') IS NULL THEN missing := array_append(missing, 'exigence_dossier'); END IF;
  IF to_regclass('public.preuve_medicale') IS NULL THEN missing := array_append(missing, 'preuve_medicale'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tarif_inscription'
      AND column_name = 'compte_bancaire_id'
  ) THEN
    missing := array_append(missing, 'tarif_inscription.compte_bancaire_id');
  END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Migration incomplète, éléments manquants : %', array_to_string(missing, ', ');
  END IF;
END $$;

COMMIT;
