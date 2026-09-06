# Registre des Fix Assolutions

Ce document est la **source de vérité des identifiants de recette Assolutions**.

## Convention

- Les **Fix 1 à 35** correspondent à la campagne historique démarrée le 30 août 2026 et ont été rétrodocumentés après livraison.
- À partir du **Fix 77**, le numéro fonctionnel et le numéro de l'issue GitHub sont identiques : **Fix 77 = issue #77**, **Fix 78 = issue #78**, etc.
- Le titre d'une issue suit donc la forme **`[Fix N] ...`**.
- Les commits de développement suivent également **`[Fix N] ...`** et non `Fix #N`.
- Une demande fonctionnelle = un numéro de Fix ; plusieurs commits peuvent appartenir au même Fix.
- L'issue est la fiche fonctionnelle de référence et peut être enrichie quand une nouvelle règle métier est découverte.
- Après validation/livraison, l'issue est fermée `completed` et les SHA de livraison sont ajoutés au registre.

> Les Fix 1 à 35 ont été committés historiquement avec la syntaxe `Fix #N`. Le dépôt contenait déjà des issues/PR plus anciennes, donc leurs numéros GitHub ne peuvent pas coïncider rétrospectivement. Leur identifiant fonctionnel `[Fix N]` reste la référence.

## Fix 1 à 35 — livrés et rétrodocumentés

| Fix | Objet fonctionnel | Issue | Commits de livraison sur `master` |
|---:|---|---:|---|
| 1 | Groupes de `Mon compte` en lecture seule, affichage stabilisé des groupes personnels / WhatsApp | GH #42 | `6142e258`, `abd24cef`, `99076f55`, `9b61093e` |
| 2 | Enrichir le mail de séance d'essai | GH #43 | `a8887ddf` |
| 3 | Réorganiser le dashboard adhérent | GH #44 | `58dfd04f` |
| 4 | Corriger l'aide en ligne / tutoriels sur mobile | GH #45 | `624cd778`, `90ffbfc0`, `86493171` |
| 5 | Supprimer le doublon « Voir ma séance » pour les professeurs | GH #46 | `08e878c2` |
| 6 | Centrer correctement le bloc de connexion, notamment sur mobile | GH #47 | `6982e2ad`, `e3768483` |
| 7 | Planifier les échéances HelloAsso au 5 du mois | GH #48 | `055e47d6` |
| 8 | N'afficher l'inscription que lorsqu'une personne est éligible sur la saison | GH #49 | `667b96cb`, `86493171`, `db20ee69` |
| 9 | Recalculer correctement l'heure de fin des séances | GH #50 | `ad08e281`, `56fac156` |
| 10 | Rendre l'adresse du gymnase facilement copiable, y compris sur mobile | GH #51 | `61c8c704`, `8b7a186e` |
| 11 | Permettre le scroll de « Contacter le club » sur mobile | GH #52 | `a154e47c` |
| 12 | Harmoniser et fiabiliser le mode sombre mobile / desktop | GH #53 | `7d2c0de4`, `bdfa2b2f`, `bb65ce73`, `4b1304d3`, `af1e94cd`, `c4430b3e`, `5a3dea36` |
| 13 | Compléter la page Tutoriels et permettre le retour mobile vers l'application | GH #54 | `e2571279`, `4486da9f` |
| 14 | Ajouter les professeurs sous contrat aux destinataires des mails | GH #55 | `004a7339`, `e250bfe4` |
| 15 | Rendre les flèches de navigation des personnes cohérentes avec le scroll | GH #56 | `09d7e3ec`, `37da744e`, `bb65ce73`, `4b1304d3` |
| 16 | Positionner correctement la fiole / action d'essai dans la liste mobile des séances | GH #57 | `bb65ce73`, `4b1304d3` |
| 17 | Distinguer une demande d'essai d'une déclaration de présence | GH #58 | `bb65ce73`, `4b1304d3` |
| 18 | Utiliser la saison consultée pour les destinataires mails et sélectionner la saison cible d'inscription depuis la fiche adhérent | GH #59 | `6f2b2b2f`, `d64f50ca`, `3169c5c2`, `f2f2f093`, `c4af196c` |
| 19 | Fiabiliser le chargement des photos par lots | GH #60 | `838199f4`, `0c4f71ed` |
| 20 | Ajouter et fiabiliser l'administration projet : comptes, personnes, coordonnées, sécurité et scroll | GH #61 | `8e49fe06`, `e55e30bc`, `a3d2eb0d`, `50fd3d08`, `51b45d6b`, `ec868792`, `817e9d5e`, `ed6ed3ee`, `71b0e437` |
| 21 | Corriger et clarifier les règles médicales selon âge, loisir/compétition, certificat et QS Sport | GH #62 | `85e57d0f`, `597bb492`, `07a2d878`, `48375dea`, `69b4c222`, `46b55df5`, `e0ead894`, `b56bfb43`, `3c9f3cbe`, `fcecba4b`, `fe6a2089` |
| 22 | Proposer le renvoi d'activation pour les comptes inactifs et avertir sur les spams | GH #63 | `38c0cb1c`, `f4fbb20e` *(rattachement rétroactif)* |
| 23 | Fiabiliser la réconciliation HelloAsso | GH #64 | `5652c84a` |
| 24 | Rafraîchir le menu au retour dans l'application | GH #65 | `36d7c93f` |
| 25 | Corriger la modification de série avec des valeurs nulles | GH #66 | `719aaf54` |
| 26 | Classer les inscriptions en cotisations | GH #67 | `949bfeb2` |
| 27 | Remonter / fiabiliser la sauvegarde des flux financiers | GH #68 | `990406f1` |
| 28 | Ne jamais modifier les séances passées d'une série et rafraîchir après modification | GH #69 | `c79f9788`, `469e170a` |
| 29 | Simplifier l'édition d'un flux financier | GH #70 | `4753c43f` |
| 30 | Fiabiliser la modification de série et la propagation des professeurs / groupes | GH #71 | `e4374e08`, `4689582d`, `1c5a58a5`, `cafbb7f3`, `33c27304`, `7a7d4334` |
| 31 | Aligner l'action « Créer des flux » sur les autres écrans | GH #72 | `7837ef19` |
| 32 | Propager réellement professeurs et groupes aux séances | GH #73 | `9c262413` |
| 33 | Identifier l'expéditeur des messages envoyés au club | GH #74 | `d66826ed` |
| 34 | Enrichir le mail de bienvenue après inscription | GH #75 | `f97800cc` |
| 35 | Utiliser le mail de bienvenue paramétré dans `mail_project` | GH #76 | `1c7e4e21`, `640ecf10` |

Toutes ces issues sont fermées avec l'état **completed**.

## Fix 77 à 90 — backlog courant

| Fix | Objet fonctionnel | Issue | État |
|---:|---|---:|---|
| 77 | Landing publique + parcours d'initialisation d'un club | GH #77 | Open |
| 78 | Remonter un bug depuis le centre de pilotage | GH #78 | Open |
| 79 | Stabiliser le token d'activation de compte | GH #79 | Open |
| 80 | Stabiliser le token de réinitialisation de mot de passe | GH #80 | Open |
| 81 | Ajouter la gestion des stocks | GH #81 | Open |
| 82 | Vue des stocks par lieu | GH #82 | Open |
| 83 | Inventaire et édition du catalogue de stocks | GH #83 | Open |
| 84 | Visualiser le suivi des emails (`mail_record`) | GH #84 | Open |
| 85 | Visualiser le suivi et les logs d'inscription | GH #85 | Open |
| 86 | Permettre la mise à jour des listes `addinfo` | GH #86 | Open |
| 87 | Ajouter un outil de création de champs `addinfo` | GH #87 | Open |
| 88 | Corriger la saisie de date personne sur Android | GH #88 | Open |
| 89 | Rendre l'`app-nav` du centre de pilotage cohérent avec le menu | GH #89 | Open |
| 90 | Généraliser les descriptions dans le centre de pilotage | GH #90 | Open |

## Règle de livraison à partir du Fix 77

1. **Fix N = issue GitHub #N** ;
2. la fiche `[Fix N]` porte l'objectif et les règles métier ;
3. toute nouvelle règle découverte est ajoutée à cette issue avant ou pendant le développement ;
4. les commits concernés commencent par `[Fix N]` ;
5. plusieurs commits peuvent traiter le même Fix ;
6. les autres Fix ne doivent pas être embarqués discrètement dans le même commit ;
7. une fois validé/livré, l'issue est fermée `completed` et les SHA sont ajoutés ici ;
8. le prochain sujet fonctionnel prend le prochain numéro GitHub disponible, qui devient automatiquement son numéro de Fix.