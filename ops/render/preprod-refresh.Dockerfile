# Adapter la version majeure à celle des deux bases Render si elle diffère.
FROM postgres:16-alpine

RUN apk add --no-cache bash

WORKDIR /app
COPY database /app/database
COPY ops/render/refresh-preprod-db.sh /usr/local/bin/refresh-preprod-db

RUN chmod +x \
  /usr/local/bin/refresh-preprod-db \
  /app/database/scripts/apply_complete_subscription_upgrade.sh

ENTRYPOINT ["/usr/local/bin/refresh-preprod-db"]
