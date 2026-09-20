-- Fix 84 - enrichissement de mail_record pour le monitoring
-- Idempotent : peut être exécuté sur recette puis production.

ALTER TABLE mail_record
  ADD COLUMN IF NOT EXISTS created_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS error text NULL;

-- Ne pas inventer une date pour les anciennes traces : elles restent NULL.
-- Les nouvelles insertions recevront automatiquement leur date.
ALTER TABLE mail_record
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE mail_record
SET status = 'SENT'
WHERE status IS NULL OR btrim(status) = '';

CREATE INDEX IF NOT EXISTS idx_mail_record_project_created_at
  ON mail_record(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_record_project_status
  ON mail_record(project_id, status);
