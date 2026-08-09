#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_VERSION="2026-08-09-02"

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

echo "==> Assolutions refresh script $SCRIPT_VERSION"
echo "==> Outils PostgreSQL"
pg_dump --version
pg_restore --version

echo "==> Vérification de la base cible préproduction"
PREPROD_DB_NAME="$(
  psql "$PREPROD_DATABASE_URL" \
    --set=ON_ERROR_STOP=1 \
    --tuples-only \
    --no-align \
    --command="SELECT current_database();"
)"
echo "$PREPROD_DB_NAME"

PROD_DB_NAME="$(
  psql "$PROD_DATABASE_URL" \
    --set=ON_ERROR_STOP=1 \
    --tuples-only \
    --no-align \
    --command="SELECT current_database();"
)"

if [[ "$PREPROD_DB_NAME" == "$PROD_DB_NAME" ]]; then
  echo "Refus de continuer : la base source et la base cible portent le même nom ($PROD_DB_NAME)" >&2
  exit 1
fi

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

echo "==> Nettoyage des tables applicatives de la préproduction"
# La préproduction contient volontairement des tables ajoutées après la copie de
# production (souscription, exigences, preuves médicales...). pg_restore --clean
# ne connaît pas ces objets absents du dump source. Leurs clés étrangères peuvent
# donc empêcher la suppression d'une PK de production. On supprime d'abord toutes
# les tables applicatives du schéma public avec CASCADE.
psql "$PREPROD_DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format(
      'DROP TABLE IF EXISTS %I.%I CASCADE',
      item.schemaname,
      item.tablename
    );
  END LOOP;
END
$$;
SQL

echo "==> Restauration directe production vers préproduction"
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
