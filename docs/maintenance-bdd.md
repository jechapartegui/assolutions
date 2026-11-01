# Maintenance PostgreSQL manuelle — Assolutions (novembre 2026)

Objectif : remplacer **après recette** le cron PROD → PREPROD, conserver PREPROD → LOCAL existant et produire des sauvegardes portables de PROD.

**Ce lot ne crée aucun cron ni ne modifie Render. Le cron existant reste actif jusqu'à son arrêt manuel après recette.**

## Les commandes Windows (à lancer depuis la racine du dépôt)

| Commande | Effet |
| --- | --- |
| npm run db:backup:prod -- --plan | Vérification de configuration, sans connexion |
| npm run db:backup:prod | Export PROD compressé vers le disque local |
| npm run db:prod-to-preprod -- --plan | Vérification de configuration, sans connexion |
| npm run db:prod-to-preprod -- --execute --preprod-isolated | Copie destructive vers PREPROD avec anonymisation et confirmation |
| npm run db:preprod-to-local | Copie PREPROD → PostgreSQL local, script PowerShell existant |

Les dumps sont déposés par défaut dans Documents/Assolutions/Backups, hors Git. Pour utiliser D:\AssolutionsBackups, ajouter -- --output-dir=D:\AssolutionsBackups à la commande npm de sauvegarde ; pour PROD → PREPROD, ajouter --output-dir=D:\AssolutionsBackups après les autres arguments.

Les archives brutes contiennent des données personnelles. Activer le chiffrement du disque (BitLocker), protéger l'accès au dossier, et **chiffrer côté client avant tout dépôt cloud**.

## Configuration non versionnée

Ajouter à apps/assolutions-back/.env.local les variables suivantes (utiliser les External Database URLs du panneau Render, jamais les Internal URLs depuis le PC) :

    DATABASE_PROD=postgresql://USER:PASSWORD@HOST_PROD:5432/DB_PROD?sslmode=require
    PROD_EXPECTED_DATABASE=DB_PROD
    PROD_EXPECTED_HOST_FRAGMENT=HOST_PROD

    DATABASE_PREPROD=postgresql://USER:PASSWORD@HOST_PREPROD:5432/DB_PREPROD?sslmode=require
    PREPROD_EXPECTED_DATABASE=DB_PREPROD
    PREPROD_EXPECTED_HOST_FRAGMENT=HOST_PREPROD
    PREPROD_TEST_PASSWORD=UN_MOT_DE_PASSE_DE_TEST_FORT_123

    DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_LOCALE

Toutes les valeurs ci-dessus sont des EXEMPLES et doivent être remplacées. Les paramètres EXPECTED sont obligatoires pour empêcher une mauvaise destination. DATABASE_URL est déjà utilisé par l'ancien script PREPROD → LOCAL.

Installer les outils PostgreSQL (psql, pg_dump, pg_restore). Le programme cherche les versions Windows dans C:\Program Files\PostgreSQL et prend la plus récente.

## PROD → PREPROD : procédure obligatoire

1. Vérifier les sauvegardes existantes et la disponibilité d'un retour arrière.
2. **Suspendre manuellement les API, workers et crons PREPROD dans Render**. Aucune requête métier ne doit s'exécuter pendant la restauration/anonymisation.
3. Désactiver les effets externes PREPROD : MAIL_SANDBOX=true, HELLOASSO_ENV=sandbox, GOOGLE_CALENDAR_ENABLED=false, GOOGLE_CALENDAR_AUTO_SYNC=false ; vérifier également les autres intégrations et secrets.
4. Exécuter le plan : npm run db:prod-to-preprod -- --plan
5. Exécuter : npm run db:prod-to-preprod -- --execute --preprod-isolated ; saisir exactement REMPLACER_PREPROD. **Le paramètre --preprod-isolated est une attestation manuelle, pas une vérification de Render.**
6. Le programme réalise successivement : export PROD, vérification de l'archive, sauvegarde initiale PREPROD, remplacement du schéma public PREPROD, puis appel de scripts/anonymize-preprod.cjs.
7. En cas d'échec, il tente de restaurer l'ancienne PREPROD. **Si le rollback échoue, conserver PREPROD hors service** et restaurer manuellement l'archive assolutions-preprod-avant-*.dump.
8. Lire le rapport d'anonymisation et vérifier les colonnes sensibles restantes. **L'anonymiseur existant doit encore être audité ; son succès technique ne prouve pas l'anonymisation exhaustive.**
9. Vérifier les comptes, les droits, les données et l'absence de connexions externes avant de redémarrer PREPROD.

**Une copie brute de PROD existe temporairement en PREPROD entre la restauration et l'anonymisation : il est impératif que l'application soit isolée.** À terme, préférer une base de staging locale dédiée, anonymisée AVANT l'envoi en PREPROD.

## Sauvegardes PROD et archivage cloud

Le format produit est PostgreSQL custom (compression 9), avec un fichier SHA-256 adjacent. La table des matières est vérifiée avec pg_restore --list ; cette vérification n'équivaut **pas** à un test de restauration réel.

- Copie locale : garder quelques sauvegardes récentes sur un disque chiffré.
- Copie externe : sauvegarde chiffrée côté client dans un bucket privé Cloudflare R2 ou Backblaze B2, par exemple via restic ; chiffrer avant transfert.
- Plan de rotation indicatif à adapter : 7 quotidiennes, 4 hebdomadaires et 6 mensuelles ; effectuer des tests de restauration périodiques dans une base indépendante.
- Ne jamais commiter de dumps, de mots de passe ou de fichiers .env dans Git/GitHub/LFS.
- Les outils de dépôt cloud et la politique automatique de rétention constituent **un lot séparé**, non configuré par cette livraison.

## Après recette

Une fois les trois parcours validés et une restauration indépendante testée, **seulement alors** désactiver puis supprimer le cron Render PROD → PREPROD. Cette opération sur Render reste manuelle.

Ne jamais supprimer une base sur Render sur la seule base de son nom. Vérifier ses connexions, sa destination et la valeur de ses variables d'environnement.
