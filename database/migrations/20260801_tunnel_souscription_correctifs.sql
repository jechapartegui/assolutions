BEGIN;

-- Suppression définitive de l'ancien brouillon de groupe par défaut.
DROP INDEX IF EXISTS public.uq_groupes_un_defaut_par_saison;
ALTER TABLE public.groupes DROP COLUMN IF EXISTS par_defaut;

-- Le payeur peut être différent des personnes inscrites.
ALTER TABLE public.souscription
  ALTER COLUMN payeur_personne_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payeur_prenom character varying(100) NULL,
  ADD COLUMN IF NOT EXISTS payeur_nom character varying(100) NULL,
  ADD COLUMN IF NOT EXISTS payeur_email character varying(250) NULL;

-- Reprise des informations existantes lorsque le payeur était une personne du compte.
UPDATE public.souscription s
SET
  payeur_prenom = COALESCE(s.payeur_prenom, p.first_name),
  payeur_nom = COALESCE(s.payeur_nom, p.last_name),
  payeur_email = COALESCE(
    s.payeur_email,
    (
      SELECT c.contact_value
      FROM public.contacts c
      WHERE c.object_type = 'rider'
        AND c.object_id = p.id
        AND upper(c.contact_type) = 'EMAIL'
        AND btrim(COALESCE(c.contact_value, '')) <> ''
      ORDER BY c.pref DESC, c.id ASC
      LIMIT 1
    )
  )
FROM public.personne p
WHERE p.id = s.payeur_personne_id
  AND (
    s.payeur_prenom IS NULL
    OR s.payeur_nom IS NULL
    OR s.payeur_email IS NULL
  );

COMMIT;
