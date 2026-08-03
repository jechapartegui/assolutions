#!/usr/bin/env bash
set -Eeuo pipefail

# Applique le modèle complet de souscription sur une base PostgreSQL existante.
# Usage : DATABASE_URL='postgresql://...' ./database/scripts/apply_complete_subscription_upgrade.sh

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL est obligatoire" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_sql() {
  local file="$1"
  echo "==> Application de ${file#$ROOT_DIR/}"
  psql "$DATABASE_URL" \
    --set=ON_ERROR_STOP=1 \
    --file="$file"
}

run_sql "$ROOT_DIR/database/scripts/20260803_upgrade_production_souscription.sql"
run_sql "$ROOT_DIR/database/migrations/20260803_photo_fiche_dossier_compat.sql"
run_sql "$ROOT_DIR/database/migrations/20260803_droit_image_facultatif.sql"

echo "==> Vérification finale"
psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
SELECT 'tarif_inscription' AS objet, to_regclass('public.tarif_inscription') IS NOT NULL AS present
UNION ALL SELECT 'souscription', to_regclass('public.souscription') IS NOT NULL
UNION ALL SELECT 'exigence_dossier', to_regclass('public.exigence_dossier') IS NOT NULL
UNION ALL SELECT 'preuve_medicale', to_regclass('public.preuve_medicale') IS NOT NULL
UNION ALL SELECT 'photo_sync_trigger', EXISTS (
  SELECT 1
  FROM pg_trigger
  WHERE tgname = 'trg_sync_photo_member_vers_dossier'
    AND NOT tgisinternal
);
SQL

echo "Mise à niveau terminée."
