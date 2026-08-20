# Anonymisation de la préproduction

L'anonymisation est intégrée au **même CRON Render** que la copie PROD → PREPROD.

## Mode actuel / activation progressive

Le CRON copie toujours la production vers la préproduction.

- `PREPROD_ANONYMIZE_AFTER_REFRESH=false` : la copie reste fidèle à la PROD. À utiliser temporairement si l'on doit reproduire exactement un cas réel. Dans ce mode, la PREPROD contient des données sensibles et doit être protégée comme telle.
- `PREPROD_ANONYMIZE_AFTER_REFRESH=true` : le CRON enchaîne automatiquement copie puis anonymisation puis contrôle final.

Pour activer l'anonymisation plus tard, il suffit donc de changer cette variable dans le service CRON Render ; il n'y a pas de commande ou de deuxième job à ajouter.

Le script `scripts/anonymize-preprod.cjs` refuse de démarrer sauf si les garde-fous suivants sont présents :

- `APP_ENV=preprod` (fourni automatiquement par le CRON lors de l'appel)
- `ANONYMIZE_PREPROD_CONFIRM=ANONYMIZE_PREPROD` (fourni automatiquement par le CRON)
- `PREPROD_EXPECTED_DATABASE=<nom exact de la BDD préprod>`
- `PREPROD_EXPECTED_HOST_FRAGMENT=<fragment du host PostgreSQL préprod>`

Il faut également fournir :

- `PREPROD_DATABASE_URL`
- `PREPROD_TEST_PASSWORD` : mot de passe commun aux comptes anonymisés, au moins 12 caractères avec un chiffre.

## Tester manuellement sans rien modifier

```bash
APP_ENV=preprod \
ANONYMIZE_PREPROD_CONFIRM=ANONYMIZE_PREPROD \
PREPROD_EXPECTED_DATABASE=nom_bdd_preprod \
PREPROD_EXPECTED_HOST_FRAGMENT=fragment-host-preprod \
PREPROD_TEST_PASSWORD='MotDePasseTest123!' \
PREPROD_DATABASE_URL='postgresql://...' \
ANONYMIZE_PREPROD_DRY_RUN=true \
npm run anonymize:preprod
```

Le script effectue alors toutes les requêtes dans une transaction puis fait `ROLLBACK`.

## Exécution réelle

Le CRON l'exécute automatiquement lorsque `PREPROD_ANONYMIZE_AFTER_REFRESH=true`.

Le script anonymise notamment : comptes, personnes, contacts, documents/photos, données additionnelles, snapshots et preuves médicales, souscriptions, contrats prof, opérations bancaires et flux financiers. Les identifiants techniques et relations sont conservés pour que la préprod reste exploitable.

Les comptes deviennent `preprod.compte.<id>@example.invalid` et utilisent tous `PREPROD_TEST_PASSWORD`.

En fin d'exécution, le script affiche les comptes administrateurs de chaque projet et signale les colonnes au nom potentiellement sensible qui ne sont pas couvertes explicitement. Le CRON effectue en plus un contrôle simple et échoue si des logins de comptes non anonymisés subsistent.

## Important

Que l'anonymisation soit activée ou non, la préprod doit conserver :

- `MAIL_SANDBOX=true`
- des credentials HelloAsso **sandbox**, distincts de la production
- des secrets JWT / TOKEN_PEPPER distincts de la production

Lorsque `PREPROD_ANONYMIZE_AFTER_REFRESH=false`, l'accès à la préprod doit être considéré comme un accès à des données de production.
