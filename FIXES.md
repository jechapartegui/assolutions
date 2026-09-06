# Registre des Fix Assolutions

Ce document est la **source de vérité des identifiants de recette Assolutions**.

## Convention

- `Fix N` est un identifiant fonctionnel Assolutions. Ce n'est **pas** le numéro d'une issue GitHub.
- Depuis le Fix 36, les commits doivent utiliser la syntaxe **`[Fix N]`** et jamais `Fix #N`.
- Le caractère `#` est réservé aux vrais objets GitHub (`GH #28`, PR `#27`, etc.).
- Exemple de commit : `[Fix 38] fix(auth): réutiliser un token d'activation encore valide`.
- Exemple dans une PR : `Fix 38 — GH #30`.

> Historique : les Fix 1 à 35 de la campagne de recette commencée le 30 août 2026 ont été committés avec la syntaxe `Fix #N`. GitHub interprète parfois ce texte comme une référence à l'issue/PR GitHub `#N`, ce qui peut produire un lien faux. Les correspondances ci-dessous font foi.
>
> Des commits plus anciens (notamment en mai 2026) portent déjà des messages tels que `fix #4` ou `fix #7`. Ils sont antérieurs à cette campagne de recette et sont volontairement exclus du présent registre.

## Fix livrés — campagne du 30 août au 4 septembre 2026

| Fix | Objet fonctionnel | Commits de livraison sur `master` |
|---:|---|---|
| 1 | Groupes de `Mon compte` en lecture seule, affichage stabilisé des groupes personnels / WhatsApp | `6142e258`, `abd24cef`, `99076f55`, `9b61093e` |
| 2 | Enrichir le mail de séance d'essai | `a8887ddf` |
| 3 | Réorganiser le dashboard adhérent | `58dfd04f` |
| 4 | Corriger l'aide en ligne / tutoriels sur mobile | `624cd778`, `90ffbfc0`, `86493171` |
| 5 | Supprimer le doublon « Voir ma séance » pour les professeurs | `08e878c2` |
| 6 | Centrer correctement le bloc de connexion, notamment sur mobile | `6982e2ad`, `e3768483` |
| 7 | Planifier les échéances HelloAsso au 5 du mois | `055e47d6` |
| 8 | N'afficher l'inscription que lorsqu'une personne est éligible sur la saison | `667b96cb`, `86493171`, `db20ee69` |
| 9 | Recalculer correctement l'heure de fin des séances | `ad08e281`, `56fac156` |
| 10 | Rendre l'adresse du gymnase facilement copiable, y compris sur mobile | `61c8c704`, `8b7a186e` |
| 11 | Permettre le scroll de « Contacter le club » sur mobile | `a154e47c` |
| 12 | Harmoniser et fiabiliser le mode sombre mobile / desktop | `7d2c0de4`, `bdfa2b2f`, `bb65ce73`, `4b1304d3`, `af1e94cd`, `c4430b3e`, `5a3dea36` |
| 13 | Compléter la page Tutoriels et permettre le retour mobile vers l'application | `e2571279`, `4486da9f` |
| 14 | Ajouter les professeurs sous contrat aux destinataires des mails | `004a7339`, `e250bfe4` |
| 15 | Rendre les flèches de navigation des personnes cohérentes avec le scroll | `09d7e3ec`, `37da744e`, `bb65ce73`, `4b1304d3` |
| 16 | Positionner correctement la fiole / action d'essai dans la liste mobile des séances | `bb65ce73`, `4b1304d3` |
| 17 | Distinguer une demande d'essai d'une déclaration de présence | `bb65ce73`, `4b1304d3` |
| 18 | Utiliser la saison consultée pour les destinataires mails et sélectionner la saison cible d'inscription depuis la fiche adhérent | `6f2b2b2f`, `d64f50ca`, `3169c5c2`, `f2f2f093`, `c4af196c` |
| 19 | Fiabiliser le chargement des photos par lots | `838199f4`, `0c4f71ed` |
| 20 | Ajouter et fiabiliser l'administration projet : comptes, personnes, coordonnées, sécurité et scroll | `8e49fe06`, `e55e30bc`, `a3d2eb0d`, `50fd3d08`, `51b45d6b`, `ec868792`, `817e9d5e`, `ed6ed3ee`, `71b0e437` |
| 21 | Corriger et clarifier les règles médicales selon âge, loisir/compétition, certificat et QS Sport | `85e57d0f`, `597bb492`, `07a2d878`, `48375dea`, `69b4c222`, `46b55df5`, `e0ead894`, `b56bfb43`, `3c9f3cbe`, `fcecba4b`, `fe6a2089` |
| 22 | Proposer le renvoi d'activation pour les comptes inactifs et avertir sur les spams | `38c0cb1c`, `f4fbb20e` *(commits historiquement non numérotés ; rattachement rétrospectif entre Fix 21 et Fix 23)* |
| 23 | Fiabiliser la réconciliation HelloAsso | `5652c84a` |
| 24 | Rafraîchir le menu au retour dans l'application | `36d7c93f` |
| 25 | Corriger la modification de série avec des valeurs nulles | `719aaf54` |
| 26 | Classer les inscriptions en cotisations | `949bfeb2` |
| 27 | Remonter / fiabiliser la sauvegarde des flux financiers | `990406f1` |
| 28 | Ne jamais modifier les séances passées d'une série et rafraîchir après modification | `c79f9788`, `469e170a` |
| 29 | Simplifier l'édition d'un flux financier | `4753c43f` |
| 30 | Fiabiliser la modification de série et la propagation des professeurs / groupes | `e4374e08`, `4689582d`, `1c5a58a5`, `cafbb7f3`, `33c27304`, `7a7d4334` |
| 31 | Aligner l'action « Créer des flux » sur les autres écrans | `7837ef19` |
| 32 | Propager réellement professeurs et groupes aux séances | `9c262413` |
| 33 | Identifier l'expéditeur des messages envoyés au club | `d66826ed` |
| 34 | Enrichir le mail de bienvenue après inscription | `f97800cc` |
| 35 | Utiliser le mail de bienvenue paramétré dans `mail_project` | `1c7e4e21`, `640ecf10` |

## Fix prévus — release 36 à 49

| Fix | Objet fonctionnel | Issue GitHub | État |
|---:|---|---:|---|
| 36 | Landing publique + parcours d'initialisation d'un club | GH #28 | À faire |
| 37 | Remonter un bug depuis le centre de pilotage | GH #29 | À faire |
| 38 | Stabiliser le token d'activation de compte | GH #30 | À faire |
| 39 | Stabiliser le token de réinitialisation de mot de passe | GH #41 | À faire |
| 40 | Ajouter la gestion des stocks | GH #31 | À faire |
| 41 | Vue des stocks par lieu | GH #32 | À faire |
| 42 | Inventaire et édition du catalogue de stocks | GH #33 | À faire |
| 43 | Visualiser le suivi des emails (`mail_record`) | GH #34 | À faire |
| 44 | Visualiser le suivi et les logs d'inscription | GH #35 | À faire |
| 45 | Permettre la mise à jour des listes `addinfo` | GH #36 | À faire |
| 46 | Ajouter un outil de création de champs `addinfo` | GH #37 | À faire |
| 47 | Corriger la saisie de date personne sur Android | GH #38 | À faire |
| 48 | Rendre l'`app-nav` du centre de pilotage cohérent avec le menu | GH #39 | À faire |
| 49 | Généraliser les descriptions dans le centre de pilotage | GH #40 | À faire |

## Règle de livraison à partir du Fix 36

Pour éviter toute ambiguïté :

1. une demande fonctionnelle = un identifiant `Fix N` ;
2. un ou plusieurs commits peuvent appartenir au même Fix ;
3. tous les commits concernés commencent par `[Fix N]` ;
4. l'issue GitHub est référencée séparément (`GH #xx`) ;
5. à la livraison, ce registre est mis à jour avec les SHA réels et l'état `Livré` ;
6. on ne réutilise jamais un numéro de Fix pour un autre sujet.
