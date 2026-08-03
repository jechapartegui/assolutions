#!/usr/bin/env bash
set -Eeuo pipefail

# Remplace intégralement la base de préproduction par une copie logique de la
# production, puis applique le modèle final de souscription.
#
# Variables requises :
#   PROD_DATABASE_URL
#   PREPROD_DATABASE_URL
#
# ATTENTION : toutes les données propres à la préproduction sont écrasées.

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "PROD_DATABASE_URL est obligatoire" >&2
  exit 1
fi

if [[ -z "${PREPROD_DATABASE_URL:-}" ]]; then
  echo "PREPROD_DATABASE_URL est obligatoire" >&2
  exit 1
fi

if [[ "$PROD_DATABASE_URL" == "$PREPROD_DATABASE_URL" ]]; then
  echo "Refus de continuer : les URL production et préproduction sont identiques" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DUMP_FILE="$(mktemp /tmp/assolutions-prod-XXXXXX.dump)"

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "==> Export logique de la production"
pg_dump "$PROD_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

echo "==> Fermeture des connexions applicatives sur la préproduction"
psql "$PREPROD_DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
SQL

echo "==> Restauration complète vers la préproduction"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname="$PREPROD_DATABASE_URL" \
  "$DUMP_FILE"

echo "==> Application du modèle final de souscription"
DATABASE_URL="$PREPROD_DATABASE_URL" \
  "$ROOT_DIR/database/scripts/apply_complete_subscription_upgrade.sh"

echo "==> Rafraîchissement terminé"
