# Copier la préprod vers la base locale

Le script `copy-preprod-to-local.ps1` remplace le contenu du schéma `public` de la base PostgreSQL locale par une copie de la préprod.

## Configuration

Dans `apps/assolutions-back/.env.local`, conserver `DATABASE_URL` pour la base locale et ajouter :

```env
DATABASE_PREPROD=postgresql://USER:PASSWORD@PREPROD_HOST:5432/PREPROD_DB?sslmode=require
```

Ne jamais versionner la vraie URL de préprod.

## Exécution

Depuis la racine du dépôt :

```powershell
npm run db:preprod-to-local
```

Le script :

1. refuse de continuer si `DATABASE_URL` ne pointe pas vers `localhost`, `127.0.0.1` ou `::1` ;
2. lit la préprod en lecture seule avec `pg_dump` ;
3. demande de taper `OUI` avant toute destruction locale ;
4. supprime puis recrée uniquement le schéma `public` local ;
5. restaure le dump sans propriétaires ni privilèges de préprod ;
6. compare le nombre de tables publiques entre la préprod et le local ;
7. supprime le fichier de dump temporaire.

Les outils `pg_dump`, `pg_restore` et `psql` doivent être présents. Sous Windows, le script cherche automatiquement dans le `PATH`, dans le runtime de pgAdmin 4 et dans `C:\Program Files\PostgreSQL\*\bin`.

Pour un lancement non interactif explicitement voulu :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/copy-preprod-to-local.ps1 -Yes
```
