-- Derniere evolution de schema avant passage en production.
-- Le compte bancaire est porte par le tarif afin de savoir ou affecter
-- les operations generees lors de la confirmation d'une souscription.

ALTER TABLE tarif_inscription
  ADD COLUMN IF NOT EXISTS compte_bancaire_id integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tarif_inscription_compte_bancaire'
  ) THEN
    ALTER TABLE tarif_inscription
      ADD CONSTRAINT fk_tarif_inscription_compte_bancaire
      FOREIGN KEY (compte_bancaire_id)
      REFERENCES compte_bancaire(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tarif_inscription_compte_bancaire
  ON tarif_inscription(compte_bancaire_id);
