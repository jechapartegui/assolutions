# Installation PREPROD — release 2026-09

Ce README est la procédure de référence pour la release FFRS / représentants légaux / QS Sport / CRA / Fix 98.

## Principe important : le CRON remet PREPROD à l'état de PROD

Le CRON `ops/render/refresh-preprod-db.sh` fait une copie **PRODUCTION -> PREPRODUCTION** avec `pg_dump/pg_restore --clean`.

Donc, tant que la migration de cette release n'est pas aussi présente en PROD, **chaque exécution du CRON efface les tables/colonnes propres à la release PREPROD**.

L'ordre est donc impératif :

1. CRON PROD -> PREPROD.
2. Migration de release sur PREPROD.
3. Imports de données de release sur PREPROD.
4. Copie PREPROD -> LOCAL si l'on veut tester exactement cette base.

Ne pas lancer le CRON entre les étapes 2/3 et l'étape 4.

## 0 — Code à utiliser

Pour tester cette release avant merge, utiliser la branche :

`feature/release-ffrs-cra`

Le CRON doit lui aussi utiliser cette branche (ou au minimum une image construite depuis cette branche) si l'on veut bénéficier du **Fix 99** de `ops/render/refresh-preprod-db.sh`, qui purge l'ancienne table `document` avant restauration pour limiter le pic d'espace disque.

Attention : publier le code de la branche ne modifie pas le schéma de la base. La migration SQL reste obligatoire après le CRON.

## 1 — Backup PREPROD

Faire un backup de PREPROD avant la première installation.

## 2 — Lancer le CRON PROD -> PREPROD

Lancer le job Render construit depuis `feature/release-ffrs-cra`.

Attendre obligatoirement :

`==> Rafraîchissement PROD -> PREPROD terminé avec succès`

Si le job échoue, **ne pas continuer**.

## 3 — Appliquer la migration de release

Sur PREPROD, exécuter **uniquement** :

`database/migrations/20260926_release_ffrs_qs_cra.sql`

Cette migration est rejouable et crée notamment `representant_legal`, le schéma CRA et les éléments FFRS nécessaires.

Elle ne relâche pas les contraintes du coeur `personne`.

## 4 — Importer les données FFRS

### 4.1 Licence / catégorie / type

Depuis la racine du dépôt :

`python database/tools/generate_ffrs_import.py extraction_licences_20260926120450.xlsx > database/generated/import_ffrs_2026_2027.sql`

Lire les contrôles en fin de fichier puis exécuter sur PREPROD :

`database/generated/import_ffrs_2026_2027.sql`

### 4.2 Représentants légaux

Le fichier réel contient des données personnelles et **ne doit pas être committé dans ce dépôt public**.

Utiliser localement le fichier privé :

`import_representants_legaux_ffrs_2026_2027.sql`

Il doit être exécuté **après** la migration, car il écrit dans `representant_legal`.

Le fichier `database/generated/import_representants_legaux_ffrs_2026_2027.sql` présent dans Git est seulement un aide-mémoire sans donnée personnelle.

## 5 — Contrôles PREPROD

Exécuter au minimum :

```sql
SELECT COUNT(*) FROM representant_legal;

SELECT COUNT(*) FROM personne;

SELECT COUNT(*) FROM cra;

SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personne'
  AND column_name IN ('date_naissance', 'address', 'pays')
ORDER BY column_name;
```

Les contraintes historiques de `personne` doivent rester celles du modèle existant ; cette release ne les rend pas nullable.

Tester ensuite dans l'application : édition adulte, édition mineur + 1/2 représentants, export Excel, export FFRS et anonymisation RGPD.

## 6 — Copier PREPROD vers LOCAL

Une fois les étapes 2 à 5 terminées, la PREPROD contient PROD + migration + imports. On peut alors la recopier en local.

Dans `apps/assolutions-back/.env.local` :

```env
DATABASE_URL=postgresql://...base_locale...
DATABASE_PREPROD=postgresql://...preprod...
```

Puis, depuis la racine :

`npm run db:preprod-to-local`

Le script `scripts/copy-preprod-to-local.ps1` vérifie que la cible est locale, demande `OUI`, remplace le schéma public local et contrôle le nombre de tables.

À la fin, LOCAL est une copie de la PREPROD **après migration/import**, ce qui est l'état souhaité pour les tests.

## Scripts actifs de cette release

- `database/migrations/20260926_release_ffrs_qs_cra.sql` : migration à passer.
- `database/tools/generate_ffrs_import.py` : générateur FFRS.
- `database/generated/import_ffrs_2026_2027.sql` : généré localement, non destiné à Git avec des données personnelles.
- `import_representants_legaux_ffrs_2026_2027.sql` : fichier privé fourni séparément, à ne pas committer.
- `ops/render/refresh-preprod-db.sh` : CRON PROD -> PREPROD.
- `scripts/copy-preprod-to-local.ps1` : PREPROD -> LOCAL.

## OLD

`database/OLD/` contient les migrations/scripts historiques conservés uniquement pour référence.

**Ne rien exécuter depuis OLD pour cette installation.**

## Résumé ultra-court

`CRON PROD -> PREPROD`
→ `20260926_release_ffrs_qs_cra.sql`
→ import FFRS
→ import représentants légaux
→ tests PREPROD
→ `npm run db:preprod-to-local`
→ tests LOCAL.
