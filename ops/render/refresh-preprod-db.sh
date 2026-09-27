#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_VERSION="2026-09-27-04"

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
# Anonymisation optionnelle, dans LE MÊME CRON :
#   PREPROD_ANONYMIZE_AFTER_REFRESH=true
#
# Si l'anonymisation est activée, le script scripts/anonymize-preprod.cjs exige
# également PREPROD_EXPECTED_DATABASE, PREPROD_EXPECTED_HOST_FRAGMENT et
# PREPROD_TEST_PASSWORD. Laisser la variable à false permet temporairement de
# conserver une copie fidèle de PROD pour reproduire un cas réel ; dans ce mode
# la PREPROD doit être considérée comme contenant des données sensibles.
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

# Fix 99 : la table document peut contenir les fichiers eux-mêmes dans file_data
# (BYTEA). Avec --single-transaction, l'ancienne PREPROD peut conserver beaucoup
# d'espace pendant que la nouvelle copie est écrite. On mesure puis on libère
# volontairement les anciens documents de PREPROD avant le restore.
PROD_DB_SIZE="$(sql_scalar "$PROD_DATABASE_URL" "SELECT pg_size_pretty(pg_database_size(current_database()));")"
PREPROD_DB_SIZE="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT pg_size_pretty(pg_database_size(current_database()));")"
PROD_DOCUMENT_SIZE="$(sql_scalar "$PROD_DATABASE_URL" "SELECT CASE WHEN to_regclass('public.document') IS NULL THEN 'absente' ELSE pg_size_pretty(pg_total_relation_size('public.document')) END;")"
PREPROD_DOCUMENT_SIZE="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT CASE WHEN to_regclass('public.document') IS NULL THEN 'absente' ELSE pg_size_pretty(pg_total_relation_size('public.document')) END;")"

echo "==> Taille PROD     : $PROD_DB_SIZE (document: $PROD_DOCUMENT_SIZE)"
echo "==> Taille PREPROD  : $PREPROD_DB_SIZE (document: $PREPROD_DOCUMENT_SIZE)"

PREPROD_HAS_DOCUMENT="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT to_regclass('public.document') IS NOT NULL;")"
if [[ "$PREPROD_HAS_DOCUMENT" == "t" ]]; then
  echo "==> Libération préventive des anciennes données documentaires en PREPROD"
  # document est référencée par preuve_medicale (et potentiellement d'autres tables
  # selon la version du schéma). CASCADE tronque uniquement les tables dépendantes
  # signalées par PostgreSQL ; elles seront toutes recréées/rechargées juste après
  # depuis le dump PROD par pg_restore.
  psql "$PREPROD_DATABASE_URL" -X --set=ON_ERROR_STOP=1 --command="TRUNCATE TABLE public.document CASCADE;"
fi

echo "==> Restauration dans la PREPRODUCTION (transactionnelle hors purge préalable des anciens documents)"

# IMPORTANT : ne jamais faire de DROP préalable dans une commande séparée.
# --single-transaction garantit que les DROP/CREATE/COPY du restore sont validés
# ensemble. Exception assumée (Fix 99) : l'ancien contenu de document est purgé
# juste avant afin de libérer les BYTEA et d'éviter un pic disque proche de deux
# copies complètes. En cas d'échec, le reste de PREPROD est rollbacké mais ses
# anciens documents restent purgés ; le cron suivant les reconstruira depuis PROD.
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

ANONYMIZE_FLAG="$(printf '%s' "${PREPROD_ANONYMIZE_AFTER_REFRESH:-false}" | tr '[:upper:]' '[:lower:]')"
case "$ANONYMIZE_FLAG" in
  true|1|yes)
    echo "==> Anonymisation PREPROD activée dans le CRON"
    APP_ENV=preprod \
    ANONYMIZE_PREPROD_CONFIRM=ANONYMIZE_PREPROD \
    PREPROD_DATABASE_URL="$PREPROD_DATABASE_URL" \
      node /app/scripts/anonymize-preprod.cjs

    NON_ANON_ACCOUNT_COUNT="$(sql_scalar "$PREPROD_DATABASE_URL" "SELECT count(*) FROM public.compte WHERE login IS NOT NULL AND login NOT LIKE 'preprod.compte.%@example.invalid';")"
    if [[ "$NON_ANON_ACCOUNT_COUNT" != "0" ]]; then
      echo "Contrôle anonymisation KO : $NON_ANON_ACCOUNT_COUNT compte(s) non anonymisé(s)" >&2
      exit 1
    fi
    echo "==> Contrôle anonymisation OK"
    ;;
  false|0|no|'')
    echo "==> Anonymisation PREPROD désactivée (PREPROD_ANONYMIZE_AFTER_REFRESH=$ANONYMIZE_FLAG)"
    echo "==> ATTENTION : la PREPROD contient donc une copie fidèle de données PROD"
    ;;
  *)
    echo "PREPROD_ANONYMIZE_AFTER_REFRESH doit valoir true/false (reçu: $ANONYMIZE_FLAG)" >&2
    exit 1
    ;;
esac

echo "==> Rafraîchissement PROD -> PREPROD terminé avec succès"
