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

ROOT_DIR="${APP_ROOT:-/app}"

if [[ ! -x "$ROOT_DIR/database/scripts/apply_complete_subscription_upgrade.sh" ]]; then
  echo "Script de migration introuvable : $ROOT_DIR/database/scripts/apply_complete_subscription_upgrade.sh" >&2
  exit 1
fi

DUMP_FILE="/tmp/assolutions-prod-$(date +%s)-$$.dump"

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "==> Outils PostgreSQL"
pg_dump --version
pg_restore --version

echo "==> Vérification de la base cible préproduction"
psql "$PREPROD_DATABASE_URL" --set=ON_ERROR_STOP=1 --tuples-only --no-align \
  --command="SELECT current_database();"

echo "==> Export logique de la production vers $DUMP_FILE"
pg_dump "$PROD_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
  echo "Le dump de production est vide : restauration annulée" >&2
  exit 1
fi

echo "==> Restauration directe production vers préproduction"
# Render conserve des connexions système que l'utilisateur PostgreSQL géré ne
# peut pas terminer. Ce n'est pas nécessaire : pg_restore nettoie directement
# les objets applicatifs de la base cible puis les recrée depuis le dump.
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

echo "==> Contrôle final de la préproduction"
psql "$PREPROD_DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
SELECT current_database() AS database,
       (SELECT count(*) FROM public.personne) AS personnes,
       to_regclass('public.souscription') IS NOT NULL AS souscription_presente,
       to_regclass('public.preuve_medicale') IS NOT NULL AS preuve_medicale_presente;
SQL

echo "==> Rafraîchissement terminé avec succès"
