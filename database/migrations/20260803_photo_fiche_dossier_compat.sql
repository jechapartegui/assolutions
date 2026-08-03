/*
  Compatibilité photo fiche adhérent / dossier
  --------------------------------------------
  La fiche adhérent historique stocke les photos avec objet_type = 'member'.
  Le moteur de dossier utilise les documents rattachés à la personne avec
  objet_type = 'rider'. Ce miroir technique maintient les deux lectures sans
  changer le stockage historique utilisé par l'éditeur adhérent.
*/

BEGIN;

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
    titre,
    objet_id,
    objet_type,
    typedoc,
    file_data,
    file_path,
    storage_type,
    mimetype,
    date_import,
    date_document,
    date_expiration,
    valide,
    commentaire,
    auteur,
    project_id
  )
  VALUES (
    COALESCE(NEW.titre, 'Photo'),
    NEW.objet_id,
    'rider',
    'photo',
    NEW.file_data,
    NEW.file_path,
    NEW.storage_type,
    NEW.mimetype,
    COALESCE(NEW.date_import, now()),
    NEW.date_document,
    NEW.date_expiration,
    COALESCE(NEW.valide, true),
    'MIROIR_PHOTO_MEMBER',
    NEW.auteur,
    NEW.project_id
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_photo_member_vers_dossier
  ON public.document;

CREATE TRIGGER trg_sync_photo_member_vers_dossier
AFTER INSERT OR UPDATE OR DELETE
ON public.document
FOR EACH ROW
EXECUTE FUNCTION public.sync_photo_member_vers_dossier();

/* Backfill des photos déjà présentes. */
DELETE FROM public.document
WHERE lower(btrim(objet_type)) = 'rider'
  AND lower(btrim(typedoc)) = 'photo'
  AND commentaire = 'MIROIR_PHOTO_MEMBER';

INSERT INTO public.document (
  titre,
  objet_id,
  objet_type,
  typedoc,
  file_data,
  file_path,
  storage_type,
  mimetype,
  date_import,
  date_document,
  date_expiration,
  valide,
  commentaire,
  auteur,
  project_id
)
SELECT
  COALESCE(d.titre, 'Photo'),
  d.objet_id,
  'rider',
  'photo',
  d.file_data,
  d.file_path,
  d.storage_type,
  d.mimetype,
  d.date_import,
  d.date_document,
  d.date_expiration,
  COALESCE(d.valide, true),
  'MIROIR_PHOTO_MEMBER',
  d.auteur,
  d.project_id
FROM public.document d
WHERE lower(btrim(d.objet_type)) = 'member'
  AND lower(btrim(d.typedoc)) = 'photo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.document existing
    WHERE existing.objet_id = d.objet_id
      AND lower(btrim(existing.objet_type)) = 'rider'
      AND lower(btrim(existing.typedoc)) = 'photo'
  );

COMMIT;
