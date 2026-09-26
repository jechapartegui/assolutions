# Installation PREPROD — release FFRS / QS / CRA

Pour cette release, ne pas rejouer les anciens scripts SQL ponctuels.

## Ordre

1. Faire un backup de la base PREPROD.
2. Exécuter `database/migrations/20260926_release_ffrs_qs_cra.sql`.
3. Générer l'import FFRS depuis l'extraction officielle :
   `python scripts/generate_ffrs_import.py extraction_licences_20260926120450.xlsx > database/import_ffrs_2026_2027.generated.sql`
4. Lire le contrôle en fin de fichier généré puis exécuter ce fichier sur PREPROD.
5. Déployer/rebuilder le back puis le front de la branche `feature/release-ffrs-cra`.

## Scripts à NE PAS passer pour cette installation

- `database/upgrade_schema.sql` : migration historique globale, conservée comme référence.
- `database/migrations/20260906_mail_record_monitoring.sql` : migration mail indépendante de cette release.
- Les anciens scripts ponctuels exigences/Derby/tunnel ont été retirés de la branche : leurs prérequis encore utiles sont consolidés dans la migration du 26/09.

## Import FFRS

Le rapprochement utilise nom + prénom + date de naissance.
Les champs mis à jour sont :
- Numéro de licence ;
- Catégorie FFRS ;
- Type licence FFRS (uniquement Loisir ou Compétition).

Les types fédéraux Dirigeant / Encadrant sportif / Officiel de compétition ne sont pas convertis artificiellement en Loisir ou Compétition.

En cas de rapprochement ambigu, l'import doit s'arrêter : ne pas corriger directement en production sans contrôler la personne.
