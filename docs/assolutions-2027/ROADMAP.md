# Assolutions 2027 — Feuille de route technique

Statut : **chantier ouvert — aucune mise en production autorisée depuis cette branche**.
Branche d'intégration : `release/assolutions-2027`.
Base : `master` au 30 octobre 2026.
Objectif de MEP/MES : **début 2027**, après recette et période de stabilisation. Date exacte à fixer à partir des critères qualité, pas du calendrier seul.

## Vision et invariants

- Logiciel associatif partagé, sans impératif commercial.
- Une application web Angular/NestJS/PostgreSQL ; pas de client lourd ni microservices.
- Priorité à la performance de production et à la fiabilité de l'authentification.
- Aucune régression fonctionnelle ; isolation multi-projets et respect des droits.
- Pas de modification directe de la base PROD pour les expérimentations.
- Les correctifs urgents sur `master` restent possibles ; ils doivent être réintégrés dans cette branche.
- Ne pas confondre *frontières métier* et *bundles Angular* : les adhérents font partie de la vie sportive et associative du club. Les saisons, lieux, groupes, personnes et droits sont des référentiels transverses, réutilisés par les écrans. On sépare les routes au niveau technique pour charger uniquement le nécessaire.

## Stratégie Git et livraison

```text
master                      (PROD, stable)
  ├── hotfix/*              (correctifs immédiats, revus puis fusionnés dans master)
  └── release/assolutions-2027  (intégration et recette de la prochaine version)
       ├── perf/2027-01-*   (petites branches thématiques puis PR vers release)
       ├── perf/2027-02-*
       └── ...
```

- Chaque fonctionnalité : commit cohérent, tests unitaires et build, PR et revue.
- Jamais de déploiement automatique de `release/assolutions-2027` vers la PROD.
- Environnement de recette branché sur release, isolé des intégrations réelles (mails, paiements, invitations et calendriers).
- Rebase/merge périodique de master vers release. Pas de freeze qui ferait diverger le correctif de sécurité.
- Fin 2026 : code freeze, recette totale, performance comparée, correction des anomalies.
- Début 2027 : publication seulement avec validation expresse et plan de rollback.
- Correctif de reconnexion : candidat à un hotfix anticipé sur master, une fois les tests passés.

## Lots et tickets

| Lot | Tickets | Contenu | Critère de sortie |
| --- | --- | --- | --- |
| L0 — Baseline | PERF-000, PERF-008, PERF-012, OPS-000 | Profilage navigation, instrumentations des temps API/SQL, tailles de bundles, cartographie Render | Mesures reproductibles enregistrées |
| L1 — Réactivité | PERF-001, PERF-003, PERF-004 | Photos non bloquantes, filtres mémorisés, menu rendu depuis le cache avec invalidation ciblée | Mesures améliorées, parcours inchangés |
| L2 — Navigation | PERF-006 | Lazy loading de routes et modules, services transverses stables | Réduction initiale JS ; liens directs valides |
| L3 — API et SQL | PERF-005, PERF-007, PERF-009 | Récupération en lots, endpoints listes allégées, plans SQL mesurés et index justifiés | Amélioration p95 sans fuite de données |
| L4 — Exploitation | PERF-010, PERF-011, OPS-001, OPS-002, OPS-003 | Build, déploiements, coûts Render, cron de maintenance, backups | Exploitation moins coûteuse et réversible |
| L5 — Stabilisation | QA-001…QA-009 | Recette multi-rôles, multi-projets et multi-navigateurs | Go / no-go documenté |

### Session persistante : AUTH-001 à AUTH-005

Hypothèses confirmées par inspection statique :
- Le backend JWT a une durée par défaut de `30d`, **sauf configuration `JWT_EXPIRES_IN` différente** dans l'environnement.
- Le frontend écrit `auth_token` en `localStorage`.
- La route racine redirige vers `/login` ; la page login ne semble pas réhydrater automatiquement une session déjà disponible.
- `AuthGuard` essaie `/auth/me` sur les routes protégées ; son `catchError` actuel nettoie la session quel que soit le type d'échec.

Tickets :
- AUTH-001 : mesurer le scénario réel : ouverture /, lien email, navigateur interne à la messagerie, session expirée, panne réseau.
- AUTH-002 : restauration initiale de session, redirection contrôlée vers la page voulue ; ne pas court-circuiter MAGIC, ACTIVATION, REINIT, CREATE.
- AUTH-003 : ne purger le jeton que si invalide/expiré ou à la déconnexion ; traiter distinctement réseau/5xx/timeouts.
- AUTH-004 : vérifier les durées `JWT_EXPIRES_IN`, le comportement multi-onglets, la sécurité du stockage, l'expiration et les permissions. Envisager à moyen terme un renouvellement serveur révocable au lieu d'allonger indéfiniment un JWT.
- AUTH-005 : tests automatiques E2E connexion, réouverture, liens directs, redirection, multi-projets, invalidation et déconnexion.

## Tests systématiques et CI — QA-001 à QA-009

Pyramide :
1. `lint` / `typecheck` / builds PROD et PREPROD.
2. Unitaires : filtres et calculs de VM, cache et invalidations, construction de sessions, règles métier.
3. Intégration API + PostgreSQL de test : sécurité par projet, endpoints listes/détails, inscriptions et mutations importantes.
4. E2E Playwright : login/restauration/logout, lien Oui/Non, adhérents, séances, inscriptions, finances, permissions, calendriers simulés.
5. Mesures de performance : cold/warm cache, taille initiale JS, octets API, p50/p95, comparaison baseline.
6. Recette manuelle ciblée si intégration externe réelle, avec comptes de test.

Tests obligatoires par PR : build + tests ciblés + non-régression de parcours affectés.
Tests obligatoires hebdomadaires : E2E complet en environnement isolé.
Tests avant MEP : intégralité des E2E, restauration backup, rollback exercé, scénario SMTP/Google/HelloAsso sandbox, validation FR/EN, sécurité multi-projets, tests mobiles et navigations depuis liens email.

## Frontières fonctionnelles / chargement différé

- **Socle transversal** : identité/session, projet, personnes, saisons, lieux, groupes, permissions, API shared et stores ; les modèles/services sont partagés, les écrans ne sont pas nécessairement chargés d'emblée.
- **Vie du club / activité sportive** : adhérents, inscriptions, cours, séances, présents, entraîneurs, événements ; fonctionnellement liés, techniquement plusieurs bundles selon les parcours.
- **Pilotage associatif** : budget, comptabilité, contrats, documents.
- **Communication** : emails, calendriers et notifications.
- **Espace public / adhérent** : parcours les plus légers pour lien de séance et inscription.

Ne pas créer un gros bundle “Gestion sportive” contenant toute l'administration. Optimiser selon les visites réelles des rôles.

## Risques particuliers

- **Photos** : blobs stockés en BDD et renvoyés en base64 ; lots de 10 et 3 appels simultanés. Ne pas rendre la liste dépendante de leur chargement.
- **Menu** : retour sur cache valide qui peut encore appeler `refreshNow`.
- **Listes** : filtrage exécuté par méthodes dans les templates.
- **Séances** : `loadPartialByIds` peut lancer N appels individuels malgré endpoint de récupération groupée existant.
- **Sécurité** : jamais de données d'autres projets, cookies/tokens protégés et logs sans données personnelles.
- **Base** : anonymisation pour la recette, désactivation des effets externes, sauvegarde vérifiée et plan de retour arrière.
- **Render** : auditer notamment les bases clone/orphelines avant toute suppression, puis seulement les ressources PROD.

## Démarrage conseillé

1. Baseline et matrice de test de référence.
2. AUTH-001, AUTH-002, AUTH-003 et leurs tests E2E ; décider si un hotfix PROD anticipé est nécessaire.
3. PERF-001, PERF-003, PERF-004 en modifications séparées.
4. PERF-006 ; puis optimisations API/SQL en fonction des mesures.
5. Intégration de tous les correctifs de master, recette finale, gel de code, MEP début 2027.

**Ce document lance le programme, il ne signifie ni que les optimisations ont été développées ni que les tests ont été exécutés.**
