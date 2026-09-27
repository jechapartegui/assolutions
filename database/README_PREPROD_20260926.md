# Base de données Assolutions

Ce dossier est volontairement organisé pour qu'une installation de PREPROD ne demande pas de deviner quels SQL exécuter.

## PREPROD — release 2026-09 FFRS / QS Sport / CRA

### Fichier SQL à passer

Exécuter **uniquement** :

`migrations/20260926_release_ffrs_qs_cra.sql`

Il contient le schéma nécessaire à cette release (FFRS, représentants légaux, QS Sport et CRA), ainsi que les petits prérequis historiques encore nécessaires.

### Mise à jour des licences FFRS

Le fichier SQL de données est généré depuis l'extraction officielle afin d'éviter de maintenir deux sources.

Depuis la racine du dépôt :

`python database/tools/generate_ffrs_import.py extraction_licences_20260926120450.xlsx > database/generated/import_ffrs_2026_2027.sql`

Puis exécuter :

`database/generated/import_ffrs_2026_2027.sql`

Le script met à jour le numéro de licence, la catégorie FFRS et le type de licence (Loisir / Compétition). Le rapprochement se fait sur nom + prénom + date de naissance et refuse les correspondances ambiguës.

## Passage PREPROD vers LOCAL

Les outils de copie de base restent dans `scripts/` car ils concernent l'environnement, pas une migration SQL :

- `scripts/copy-preprod-to-local.ps1`
- `scripts/COPY_PREPROD_TO_LOCAL.md`
- `scripts/anonymize-preprod.cjs`
- `scripts/ANONYMISATION_PREPROD.md`

Ils servent à remplacer la base locale par une copie de PREPROD puis, si nécessaire, à anonymiser les données. Ils ne sont pas à exécuter comme migration de release.

## OLD

`database/OLD/` contient les anciens SQL conservés uniquement pour historique ou dépannage.

**Ne rien exécuter depuis OLD pour une installation normale.**

## Règle pour la suite

- `database/migrations/` : migrations actives à appliquer aux environnements.
- `database/tools/` : générateurs/utilitaires liés aux données.
- `database/generated/` : SQL générés localement, prêts à être passés en base.
- `database/OLD/` : historique, jamais à passer automatiquement.
- `scripts/` : scripts d'exploitation généraux (copie/anonymisation/sécurité), pas les migrations SQL.
