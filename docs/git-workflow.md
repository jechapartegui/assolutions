# Stratégie Git et livraison — Assolutions

## Environnements et branches

| Branche | Rôle | Déploiement |
| --- | --- | --- |
| `master` | Version de référence de PROD | Render PROD uniquement, après CI et validation |
| `preprod` | Intégration / recette de la prochaine version | Render PREPROD uniquement, après CI |
| `feature/*`, `fix/*`, `perf/*` | Modifications courantes | Jamais directement en PROD ; PR vers `preprod` |
| `hotfix/*` | Correctifs urgents depuis `master` | PR vers `master`, puis réintégration vers `preprod` |
| `release/assolutions-2027` | Chantier long terme historique | Pas de déploiement automatique PROD |

**Il n'existe pas de branche distante `dev-local` : le développement local est fait dans des branches thématiques.**

## Circuit standard

1. `git fetch origin --prune` puis `git switch preprod && git pull --ff-only origin preprod`.
2. Créer `feature/<sujet>` depuis `preprod`.
3. Développer, tester en local, pousser la branche.
4. Ouvrir une PR vers `preprod` : revue, GitHub Actions (sécurité, builds et tests), migration ou scripts vérifiés si nécessaire.
5. Fusionner uniquement après contrôles verts ; procéder à la recette fonctionnelle sur Render PREPROD.
6. Ouvrir une PR `preprod` → `master` après validation de recette, sauvegarde et plan de rollback.
7. Fusionner après validation explicite, puis vérifier les déploiements Render et les journaux d'application.

Pour les correctifs urgents : créer `hotfix/<sujet>` depuis `master`, PR vers `master`, puis PR de réintégration dans `preprod` afin d'éviter les divergences.

## Gardes-fous GitHub à activer

- Appliquer une règle de protection à `master` et `preprod` : pull request obligatoire, interdiction des force-push et suppressions, respect des checks.
- Exiger au minimum les résultats des workflows de compilation et de contrôles en gardant les noms des checks réellement publiés par GitHub.
- Désactiver ou limiter les bypass (y compris administrateurs selon le besoin) et imposer la résolution des conversations.
- Interdire de supprimer une ancienne branche avant vérification de ses commits uniques et des déploiements qui la suivent.

## Render — actions manuelles jusqu'à audit des services

**Avant de changer les branches associées aux services**, inventorier les branches Git actuellement suivies par chaque API, front, worker et cron ; les paramètres d'autodeploy ; les bases associées ; les domaines ; et les intégrations externes.

- PROD : suivre `master`, choisir **After CI Checks Pass** ou garder temporairement **Off** pendant la migration.
- PREPROD : suivre `preprod` avec **After CI Checks Pass**, après vérification des variables et des effets externes.
- Aucun service PROD ne doit pointer sur `preprod`, `develop/*` ou une branche de fonctionnalités.
- Les migrations BDD sensibles sont des étapes contrôlées distinctes du simple build : backup, recette et rollback sont obligatoires.
- Vérifier les hooks santé, le statut du déploiement et la possibilité de rollback avant activation des mises en production automatiques.

## État de transition (6 novembre 2026)

- `preprod` a été créée au même commit que `master` (25cbdfd6) ; ce n'est pas encore l'ancien environnement technique PREPROD.
- `develop/2026-10-nouvelles-evolutions` contient des outils de maintenance BDD non intégrés. PR de réconciliation en brouillon : #112, cible `preprod`.
- `integration/exg-preprod` a des modifications Google Calendrier distinctes. Les examiner dans une PR séparée, ne pas les écraser.
- `release/assolutions-2027` contient une feuille de route technique distincte. Ne pas supprimer sans l'avoir intégrée ou conservée.
- Les anciennes branches sans commit unique peuvent être nettoyées après inventaire Render et sauvegarde des références utiles.
