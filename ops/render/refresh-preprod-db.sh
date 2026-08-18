#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_VERSION="2026-08-18-01"

# Rafraîchit la base de préproduction à partir d'une copie logique complète de
# la production.
#
# Sens UNIQUE :
#   PROD_DATABASE_URL  --->  PREPROD_DATABASE_URL
#
# Variables requises :
#   PROD_DATABASE_URL
#   PREPROD_DATABASE_URL
#
# ATTENTION : les objets présents dans le dump de production remplacent ceux de
# préproduction. En revanche, la restauration est atomique : en cas d'erreur,
# PostgreSQL annule la transaction et la préproduction reste dans son état
# précédent au lieu de rester à moitié supprimée / restaurée.

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

DUMP_FILE="/tmp/assolutions-prod-$(date +%s)-$$.dump"

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

sql_scalar() {
  local database_url="$1"
  local query="$2"

  psql "$database_url" \
    -X \
    --set=ON_ERROR_STOP=1 \
    --tuples-only \
    --no-align \
    --command="$query" \
    | tr -d '\r\n'
}

echo "==> Assolutions refresh script $SCRIPT_VERSION"
echo "==> Direction : PRODUCTION -> PREPRODUCTION"
echo "==> Outils PostgreSQL"
pg_dump --version
pg_restore --version
psql --version

PROD_DB_NAME="$(sql_scalar "$PROD_DATABASE_URL" 'SELECT current_database();')"
PREPROD_DB_NAME="$(sql_scalar "$PREPROD_DATABASE_URL" 'SELECT current_database();')"

PROD_ENDPOINT="$(sql_scalar "$PROD_DATABASE_URL" "SELECT COALESCE(inet_server_addr()::text, 'local') || ':' || COALESCE(inet_server_port()::text, '') || '/' || current_database();")"
PREPROD_ENDPOINT="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT COALESCE(inet_server_addr()::text, 'local') || ':' || COALESCE(inet_server_port()::text, '') || '/' || current_database();")"

echo "==> Source PROD    : $PROD_ENDPOINT"
echo "==> Cible PREPROD : $PREPROD_ENDPOINT"

if [[ -z "$PROD_DB_NAME" || -z "$PREPROD_DB_NAME" ]]; then
  echo "Impossible d'identifier les bases source/cible : opération annulée" >&2
  exit 1
fi

if [[ "$PROD_ENDPOINT" == "$PREPROD_ENDPOINT" ]]; then
  echo "Refus de continuer : PROD et PREPROD pointent vers la même base ($PROD_ENDPOINT)" >&2
  exit 1
fi

PROD_TABLE_COUNT="$(sql_scalar "$PROD_DATABASE_URL" "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
PROD_PERSON_COUNT="$(sql_scalar "$PROD_DATABASE_URL" "SELECT count(*) FROM public.personne;")"

if ! [[ "$PROD_TABLE_COUNT" =~ ^[0-9]+$ ]] || (( PROD_TABLE_COUNT < 20 )); then
  echo "Refus de copier la production : seulement $PROD_TABLE_COUNT tables publiques détectées" >&2
  exit 1
fi

if ! [[ "$PROD_PERSON_COUNT" =~ ^[0-9]+$ ]] || (( PROD_PERSON_COUNT < 1 )); then
  echo "Refus de copier la production : table personne vide ou illisible" >&2
  exit 1
fi

echo "==> Production contrôlée : $PROD_TABLE_COUNT tables publiques, $PROD_PERSON_COUNT personnes"
echo "==> Export logique COMPLET de la production vers $DUMP_FILE"

pg_dump "$PROD_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
  echo "Le dump de production est vide : restauration annulée" >&2
  exit 1
fi

# Vérifie que l'archive contient bien quelques objets structurants avant toute
# écriture sur la préproduction.
DUMP_TOC="$(pg_restore --list "$DUMP_FILE")"

for expected in "TABLE public personne" "TABLE DATA public personne" "TABLE public saison" "TABLE public project"; do
  if ! grep -Fq "$expected" <<< "$DUMP_TOC"; then
    echo "Archive de production invalide : objet attendu absent ($expected)" >&2
    exit 1
  fi
done

echo "==> Archive de production validée"
echo "==> Restauration atomique dans la PREPRODUCTION"

# IMPORTANT : ne jamais faire de DROP préalable dans une commande séparée.
# --single-transaction garantit que les DROP/CREATE/COPY du restore sont tous
# validés ensemble. Si une seule étape échoue, tout est rollbacké et la base de
# préproduction n'est pas laissée vide ou partiellement restaurée.
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  --dbname="$PREPROD_DATABASE_URL" \
  "$DUMP_FILE"

echo "==> Contrôle final de la copie"
PREPROD_TABLE_COUNT="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
PREPROD_PERSON_COUNT="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT count(*) FROM public.personne;")"

if ! [[ "$PREPROD_TABLE_COUNT" =~ ^[0-9]+$ ]] || (( PREPROD_TABLE_COUNT < PROD_TABLE_COUNT )); then
  echo "Copie incohérente : PROD=$PROD_TABLE_COUNT tables, PREPROD=$PREPROD_TABLE_COUNT tables" >&2
  exit 1
fi

if [[ "$PREPROD_PERSON_COUNT" != "$PROD_PERSON_COUNT" ]]; then
  echo "Copie incohérente : PROD=$PROD_PERSON_COUNT personnes, PREPROD=$PREPROD_PERSON_COUNT personnes" >&2
  exit 1
fi

psql "$PREPROD_DATABASE_URL" -X --set=ON_ERROR_STOP=1 <<'SQL'
SELECT current_database() AS database,
       (SELECT count(*) FROM public.personne) AS personnes,
       (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') AS tables_public,
       to_regclass('public.souscription') IS NOT NULL AS souscription_presente,
       to_regclass('public.preuve_medicale') IS NOT NULL AS preuve_medicale_presente,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'tarif_inscription'
           AND column_name = 'compte_bancaire_id'
       ) AS compte_bancaire_tarif_present;
SQL

echo "==> Rafraîchissement PROD -> PREPROD terminé avec succès"
