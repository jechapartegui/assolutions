# Anonymisation de la préproduction

Le script `scripts/anonymize-preprod.cjs` est destiné à être exécuté **juste après la copie PROD → PREPROD**.

Il refuse de démarrer sauf si les quatre garde-fous suivants sont présents :

- `APP_ENV=preprod`
- `ANONYMIZE_PREPROD_CONFIRM=ANONYMIZE_PREPROD`
- `PREPROD_EXPECTED_DATABASE=<nom exact de la BDD préprod>`
- `PREPROD_EXPECTED_HOST_FRAGMENT=<fragment du host PostgreSQL préprod>`

Il faut également fournir :

- `PREPROD_DATABASE_URL` (ou `DATABASE_URL`)
- `PREPROD_TEST_PASSWORD` : mot de passe commun aux comptes anonymisés, au moins 12 caractères avec un chiffre.

## Tester sans rien modifier

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

Même commande sans `ANONYMIZE_PREPROD_DRY_RUN=true`.

Le script anonymise notamment : comptes, personnes, contacts, documents/photos, données additionnelles, snapshots et preuves médicales, souscriptions, contrats prof, opérations bancaires et flux financiers. Les identifiants techniques et relations sont conservés pour que la préprod reste exploitable.

Les comptes deviennent `preprod.compte.<id>@example.invalid` et utilisent tous `PREPROD_TEST_PASSWORD`.

En fin d'exécution, le script affiche les comptes administrateurs de chaque projet et signale les colonnes au nom potentiellement sensible qui ne sont pas couvertes explicitement.

## Important

La préprod doit conserver `MAIL_SANDBOX=true` et des credentials HelloAsso sandbox. Le script supprime les comptes SMTP stockés en base et l'historique des mails, mais il ne peut pas modifier les variables d'environnement Render.
