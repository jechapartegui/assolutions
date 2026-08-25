# Les outils client doivent être au moins de la même version majeure que la
# base source Render. La production est actuellement en PostgreSQL 18.
FROM postgres:18-alpine

# bash pour le script de refresh, Node + pg uniquement pour l'anonymisation
# optionnelle exécutée dans le même CRON.
RUN apk add --no-cache bash nodejs npm

WORKDIR /app
RUN npm init -y >/dev/null 2>&1 \
  && npm install --omit=dev --no-audit --no-fund pg@8.16.3

COPY database /app/database
COPY scripts/anonymize-preprod.cjs /app/scripts/anonymize-preprod.cjs
COPY ops/render/refresh-preprod-db.sh /usr/local/bin/refresh-preprod-db

RUN chmod +x /usr/local/bin/refresh-preprod-db

ENTRYPOINT ["/usr/local/bin/refresh-preprod-db"]
