# Les outils client doivent être au moins de la même version majeure que la
# base source Render. La production est actuellement en PostgreSQL 18.
FROM postgres:18-alpine

RUN apk add --no-cache bash

WORKDIR /app
COPY database /app/database
COPY ops/render/refresh-preprod-db.sh /usr/local/bin/refresh-preprod-db

RUN chmod +x \
  /usr/local/bin/refresh-preprod-db \
  /app/database/scripts/apply_complete_subscription_upgrade.sh

ENTRYPOINT ["/usr/local/bin/refresh-preprod-db"]
