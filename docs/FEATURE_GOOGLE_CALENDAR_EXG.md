# Feature Google Agenda — EXG-01 à EXG-26

**GitHub :** issue #105 — branche `feature/google-calendar-sync-exg`
**Statut :** développement isolé, **non validé**. Aucune fusion en production sans recette.

## Décisions

1. Un calendrier Assolutions appartient à un projet ET à une saison. Une séance appartient à 0 ou 1 calendrier. Un calendrier regroupe 0–N groupes et 0–N séances, indépendamment des groupes convoqués.
2. La visibilité Google ne vaut pas convocation. Une personne présente dans l'agenda n'obtient aucun droit nouveau pour répondre à la séance Assolutions.
3. Les personnes d'un même compte donnent un seul invité Google ; les RSVP sont par email/compte et sont appliqués à une personne **sélectionnée manuellement**. L'API refuse toute création implicite d'inscription et préserve la présence réelle.
4. Le propriétaire Google doit être `assolutions.club@gmail.com`. Les secrets ne doivent jamais être dans Git.
5. Tous les changements Assolutions sont sauvegardés localement avant tout appel à Google. L'outbox conserve l'état d'attente et les échecs : `PENDING`, `SYNCED`, `ERROR`, `DELETE_PENDING`, `DELETED`.
6. **Google ne garantit pas l'absence totale d'emails** : même avec `sendUpdates=none`, des notifications peuvent survenir et la propagation peut être affectée. Toujours tester en LOCAL puis PREPROD.
7. L'adresse de l'organisateur Google est toujours réelle. Les emails des adhérents et du projet sont remplacés par des adresses `@yopmail.com` en LOCAL/PREPROD, avec un identifiant de compte pour éviter les collisions.

## Installation contrôlée

### 1. Base PostgreSQL (même SQL sur les trois BDD)
- Sauvegarder la base.
- Exécuter `scripts/migrations/2026-10-23-google-calendrier.sql` dans pgAdmin connecté à la base cible.
- Vérifier que **toutes les séances existantes ont `calendrier_id IS NULL`** et qu'aucune table existante n'a été vidée.
- Relancer une seconde fois le script : il doit être idempotent (tables/index/triggers/FK).
- Le SQL ne crée aucun agenda Google et n'envoie aucun courriel.

### 2. Configuration des API Google (EXG-06)
- Utiliser un projet Google Cloud dedie ; activer **Google Calendar API**.
- Google Auth Platform > Audience : type Externe pour un compte Gmail, en phase Testing ajouter **assolutions.club@gmail.com** comme utilisateur de test.
- Google Auth Platform > Data Access / scopes : demander **`openid`**, **`email`** et **`https://www.googleapis.com/auth/calendar`**. Les scopes OIDC servent a verifier formellement l'adresse authentifiee.
- Google Auth Platform > Clients : creer un client **Application Web**, avec URI de redirection autorisee **`https://developers.google.com/oauthplayground`** pour le test manuel.
- Ouvrir https://developers.google.com/oauthplayground ; Settings > "Use your own OAuth credentials", renseigner le Client ID et le secret **uniquement dans l'outil Google**, selectionner les trois scopes ci-dessus et "Offline". Autoriser le **bon compte Gmail**, puis echanger le code contre les tokens. Ne transmettre JAMAIS les tokens en chat/Git.
- Injecter les variables locales serveur sans les committer, laisser `GOOGLE_CALENDAR_AUTO_SYNC=false`.
- Une fois le refresh token obtenu, passer `GOOGLE_CALENDAR_ENABLED=true` **en local seulement** ; dans l'administration Calendriers cliquer **Tester connexion Google** : code `GOOGLE_CALENDAR_OAUTH_OK`, proprietaire verifie ; ce test est en **lecture seule**, il ne cree ni agenda ni evenement, ni invitation.
- Test negatif : autorisation d'un **autre compte Google**, puis bouton diagnostic => `GOOGLE_CALENDAR_OWNER_MISMATCH`. Retablir ensuite le bon refresh token. Ne pas lancer de synchronisation durant EXG-06.
- Important : en mode OAuth **Testing** avec scope Calendar, Google fait expirer les autorisations, y compris refresh token, au bout de **7 jours** ; pour le fonctionnement permanent, regler la publication et les verifications eventuellement demandees par Google plus tard.

Dans Google Cloud Console :
- Créer un projet spécifique et **activer Google Calendar API**.
- Configurer consentement OAuth et un client OAuth 2.0 (type application Web ou client adapté à l'obtention sécurisée d'un refresh token).
- Autoriser réellement `assolutions.club@gmail.com` via le navigateur et obtenir un **refresh token** pour le scope `https://www.googleapis.com/auth/calendar` avec consentement hors ligne.
- Placer les valeurs uniquement dans les variables du serveur local/Render (jamais côté Angular, jamais dans Git).
- Garder `GOOGLE_CALENDAR_ENABLED=false` jusqu'au test EXG-06. Le flag `GOOGLE_CALENDAR_AUTO_SYNC` reste `false` jusqu'à la validation.

Variables du backend :
```dotenv
APP_ENV=local # local | preprod | production (prioritaire sur NODE_ENV)
GOOGLE_CALENDAR_ENABLED=false
GOOGLE_CALENDAR_AUTO_SYNC=false
# Optionnel pour recette de l'automatisme : IDs de calendriers Assolutions autorises (ex. 7).
# Vide/absent = tous les calendriers deja crees sur Google si AUTO_SYNC=true.
GOOGLE_CALENDAR_AUTO_SYNC_CALENDAR_IDS=
GOOGLE_CALENDAR_CLIENT_ID=CHANGE_ME
GOOGLE_CALENDAR_CLIENT_SECRET=CHANGE_ME
GOOGLE_CALENDAR_REFRESH_TOKEN=CHANGE_ME
ASSOLUTIONS_FRONT_URL=http://localhost:2211
```
Propriete : `assolutions.club@gmail.com`, verifiee via Google OpenID Connect `userinfo` (email verifiee) puis controle de l'acces proprietaire `users/me/calendarList/primary` avant toute publication.
Une déconnexion/révocation OAuth provoque des erreurs journalisées et n'altère pas les séances Assolutions.

### Diagnostic EXG-06 : Google Calendar repond HTTP 403
- Si OpenID Connect UserInfo fonctionne, le refresh token, le scope d'identite et le proprietaire sont deja verifies. Le 403 porte alors sur l'appel en lecture seule `GET /calendar/v3/users/me/calendarList/primary`, pas sur les invitations.
- Dans Google Cloud, verifier le BON projet OAuth et ouvrir https://console.cloud.google.com/apis/library/calendar-json.googleapis.com : bouton **Activer** = API desactivee ; bouton **Gerer** = API activee.
- Si deja activee, ouvrir OAuth Playground avec **ses propres identifiants OAuth**, Step 3, methode GET sur `https://www.googleapis.com/calendar/v3/users/me/calendarList/primary`. Ne communiquer que `error.status`, `error.errors[].reason` ou `error.details[].reason`, **jamais** les codes ou tokens.
- `accessNotConfigured` / `SERVICE_DISABLED` : activer l'API Calendar dans le bon projet. `insufficientPermissions` / `ACCESS_TOKEN_SCOPE_INSUFFICIENT` : reautoriser `https://www.googleapis.com/auth/calendar`, nouveau refresh token si necessaire. D'autres motifs 403 doivent etre determines par le code Google ; ne pas deviner.
- L'API backend convertit maintenant ce 403 en statut 503 avec message de diagnostic prudent, sans exposer le JSON brut Google. Ne jamais synchroniser ni activer le worker en EXG-06.

### 3. Interface / droits
- Écran staff `/calendrier` depuis Séances ; seuls les admins peuvent créer, modifier, archiver ou synchroniser.
- Écran utilisateur `/mes-calendriers` construit via les personnes rattachées au **compte courant**. Ces données ne donnent aucun accès à une séance non autorisée.
- Éditeur Séance : associer/dissocier (admin), accéder au calendrier et forcer Google ; après sauvegarde, confirmation.
- `GOOGLE_CALENDAR_AUTO_SYNC=true` : worker de réconciliation toutes les 60 secondes, avec verrou PostgreSQL et **notifications Google désactivées**. Activez-le uniquement après test manuel.
- EXG-17 : en mode automatique, les changements de membres des groupes destinataires sont marqués `PENDING` par `fn_calendrier_lien_rider_mark_dirty`, puis réconciliés par le worker. Aucun nouvel agenda Google n'est créé automatiquement : un `google_calendar_id` existant est requis. Pour une recette **strictement limitée à un calendrier**, définir `GOOGLE_CALENDAR_AUTO_SYNC_CALENDAR_IDS=<id du calendrier Assolutions>` ; ce filtre limite le worker à cet ID, même si d'autres calendriers sont PENDING. Valeur absente = tous les calendriers Google existants, **attention en production**. L'envoi de notifications Google reste `sendUpdates=none`, qui ne garantit pas zéro mail ni que les nouvelles invitations arrivent à tous les destinataires. Le test se fait avec des comptes fictifs Yopmail uniquement.

## Recette exigence par exigence
| Exigence | Test manuel | Statut |
|---|---|---|
| EXG-01 | créer calendrier en local, vérifier projet/saison/nom/options | À tester |
| EXG-02 | relier une séance, dissocier, contrôler autres séances | À tester |
| EXG-03 | vérifier eventId/status/erreurs de chaque séance | À tester |
| EXG-04 | calendrier 2 groupes ; refuser groupe autre saison | À tester |
| EXG-05 | compte avec deux enfants : 1 compte/email | À tester |
| EXG-06 | OAuth 2.0 identité Gmail propriétaire, volontairement mauvais compte refusé ; bouton diagnostic read-only | À tester |
| EXG-07 | créer 1 agenda LOCAL puis PREPROD, noms préfixés | À tester |
| EXG-08 | renommer, archiver ; **suppression Google distante encore à finaliser** | Partiel |
| EXG-09 | cocher/décocher séances, filtrer date/nom/groupe/type | À tester |
| EXG-10 | comparer dates/heures/durée/lieu/RDV/notes dans Google | À tester |
| EXG-11 | ouvrir le lien Assolutions depuis Google ; **liens privés Oui/Non individuels non exposés dans événement partagé** | Partiel |
| EXG-12 | synchroniser 2 fois, vérifier 0 doublon, détacher une séance et vérifier nettoyage | À tester |
| EXG-13 | groupe du calendrier ≠ groupe séance : lecture ≠ convocation | À tester |
| EXG-14 | utilisateur avec 2 personnes et mail projet, dédoublonnage | À tester |
| EXG-15 | local/preprod : seules les invitations Yopmail + vrai propriétaire | À tester |
| EXG-16 | mode sans notification/avec notification, 2 confirmations | À tester |
| EXG-17 | sauvegarde séance : demande de synchro ; worker si activé | À tester |
| EXG-18 | créer/modifier/sélectionner/synchroniser dans /calendrier | À tester |
| EXG-19 | choisir calendrier depuis Séance, forcer synchro | À tester |
| EXG-20 | Mes calendriers basé sur compte multi-personnes | À tester |
| EXG-21 | lire les réponses Google avec email et candidats | À tester |
| EXG-22 | choisir une personne, importer, garder présence effective | À tester |
| EXG-23 | simuler 429, 500, 404, timeout ; idempotence et retries | À tester |
| EXG-24 | tester lecteur simple, prof, admin, projet externe | À tester |
| EXG-25 | SQL sur DB sauvegardée, exécution 2 fois | À tester |
| EXG-26 | bug fiche personne/groupe en mode prof/admin | À traiter séparément |

## Tests minimaux indispensables avant fusion

1. **SQL** en local et préprod, sauvegarde avant. Le test SQL n'a pas été exécuté dans ce dépôt en ligne.
2. **Compilation** back + front avec `npm run build:prod`, TypeScript et Angular.
3. **Sécurité** : projet A ne doit jamais lire ni modifier calendrier B. Un simple adhérent ne doit pas appeler l'API d'admin.
4. **Mass emailing** : test avec 2 comptes Yopmail, 1 compte avec deux personnes. Vérifier destinataires directement sur Google.
5. **Fuseaux et DST** : 1 séance hiver, 1 été, passage à l'heure d'été/hiver.
6. **Réponses** : absent, présent, tentative, sans réponse, compte inconnu, parent avec deux enfants ; les cas ambigus n'entrent pas en base sans choix explicite.
7. **Retrait d'événement**, annulation séance, modification lieu, groupe, temps et dates.
8. **Répétition/latence** : synchroniser 2 fois, simuler perte réseau, Google 409/429 et réponse API lente.

## Limites connues de cette première implémentation

- L'accès en lecteur à l'agenda secondaire Google n'est **pas encore automatisé par ACL** : le lien dans « Mes calendriers » peut nécessiter un partage du calendrier côté Google. Les invitations aux événements sont un canal distinct de l'abonnement à l'agenda.
- Google génère lui-même l'objet des emails d'invitation ; Assolutions ne peut pas imposer exactement `[PREPROD] - Type de mise à jour - Séance` à l'email automatique Google. Les **titres des agendas et événements** sont cependant préfixés.
- L'archivage Assolutions est fonctionnel ; **suppression distante du calendrier Google à finaliser** après un protocole de suppression sans perte involontaire.
- Les liens d'action Oui/Non individualisés ne doivent jamais être publiés dans une description Google partagée à tous. Un lien vers la séance Assolutions permet à chaque personne connectée de répondre selon ses droits existants.
- Il n'y a pas encore de parcours OAuth interactif dans le front ; configuration initiale manuelle du compte de service utilisateur OAuth.
- **Aucun essai réel Google, aucun test de build ni migration locale n'a été exécuté** lors de la création de la branche par connexion GitHub seule. Ne pas activer la fonctionnalité en production.

## Rollback prudent
1. Désactiver `GOOGLE_CALENDAR_ENABLED` et `GOOGLE_CALENDAR_AUTO_SYNC` dans Render.
2. Revenir au commit applicatif antérieur après sauvegarde.
3. Laisser les nouvelles tables/colonnes inactives plutôt que de détruire leurs références Google (permet de reprendre ou supprimer proprement les événements). Retirer les nouvelles structures seulement après vérification de toutes les séances et ressources Google.

## Lot final d'ergonomie avant PREPROD (EXG-27 à EXG-31)

- **EXG-27** : page `/calendrier`, cases « Masquer les séances passées » et « Masquer les séances annulées » cochées par défaut. Ces filtres touchent **les séances disponibles**, pas le tableau des séances retenues (toujours visibles afin de pouvoir les retirer). Libellés métier type de séance traduisibles via `$localize`, aucune modification du code/type stocké.
- **EXG-28** : densité harmonisée sur les écrans Séances/Cours/Adhérents, avec tableaux compacts, traits fins, notifications discrètes et scroll responsive pour les deux pages calendrier.
- **EXG-29** : un professeur du projet peut modifier un **calendrier existant**, sans pouvoir en créer, en archiver, modifier l'option d'envoi des notifications, consulter/importer des réponses Google ni lancer la synchronisation manuelle. Contrôles côté **API** via `assertProjectStaff` et `assertProjectAdmin` sur modification de l'option notifier / actif ; l'administrateur reste pleinement habilité.
- **EXG-30** : retrait du menu principal « Calendriers » des professeurs (accès conservé depuis Séances). « Mes calendriers » visible seulement lorsqu'au moins un calendrier actif est accessible au compte dans le projet courant, ou à l'administrateur propriétaire ; contrôle serveur `GET /calendriers/mes/existe`, sans consultation interprojet.
- **EXG-31** : bouton « Partager » sur `/mes-calendriers`, utilisant le partage natif du navigateur si disponible, ou la copie d'un texte/lien Google dans le presse-papiers sinon. **Ne donne pas de droits Google** à un tiers sur un calendrier privé : partage des autorisations à réaliser séparément dans Google / par l'administrateur. Aucun jeton Assolutions personnel copié ou envoyé.

### Recette LOCAL requise avant promotion
1. Calendrier #7 contenant une séance future et une séance passée/annulée : vérifier filtres cochés par défaut, décoches indépendantes et séances déjà retenues toujours visibles ; vérifier libellés traduits et tableau compact sur desktop et mobile.
2. Professeur authentifié : accéder depuis `/seance`, éditer un calendrier existant et sauvegarder, vérifier absence de droits création/archivage/synchro et refus API de modification des notifications. Admin : toutes opérations habituelles fonctionnelles.
3. Trois comptes : aucun calendrier actif → aucun lien « Mes calendriers » ; adhérent membre d'un groupe destinataire → lien visible ; admin propriétaire → lien visible si calendrier actif. Tester changement de projet, accès direct à la route, et changement d'appartenance aux groupes.
4. « Mes calendriers » : tableau compact, réponses Oui/Non fonctionnelles sans modifier Google RSVP. Partager : menu de partage (mobile) ou texte copié (desktop), avec avertissement explicite sur les permissions d'un agenda privé.
5. Vérifier que `GOOGLE_CALENDAR_AUTO_SYNC=false` avant PREPROD et que les profils non autorisés restent bloqués. Aucun merge PROD depuis la branche de recette.


## EXG-32 / EXG-33 — Dernières finitions mobile et accès Mon menu (24/10/2026)

- **EXG-32** — `Mes calendriers` **n'est plus dans la barre de navigation globale**. Son raccourci figure dans **Mon menu**, à côté de « Contacter le club », sur desktop et mobile **uniquement si** `GET /calendriers/mes/existe` renvoie `existe=true` (calendrier actif dont un membre du compte appartient à un groupe destinataire, dans le projet courant). `Mon menu` redirige déjà en mode ADMIN vers `menu-admin` ; les admins gardent leur gestion des calendriers sur `/calendrier`. Le privilège implicite du propriétaire du projet pour l'accès à `/mes-calendriers` a été supprimé du backend : être admin n'est **pas** être destinataire. L'appartenance explicite à un groupe destinataire demeure le critère.
- **EXG-33** — `/mes-calendriers` conserve son tableau sur desktop, mais affiche **sur mobile uniquement** des cartes complètes comme les séances de `Mon menu`, sans tableau horizontal. Informations utiles : titre, date, heures, lieu, statut particulier ; réponses Oui/Non avec état par personne éligible, ouverture séance. Masquage mobile des explications longues, statut technique Google, description, avis de partage et notifications de succès ; les erreurs restent visibles. Google Agenda, Partager et Actualiser deviennent des icônes compactes accessibles (titres et `aria-label`). Affichage des anciennes séances piloté par une icône horloge et ses attributs `aria-pressed`.
- Aucun changement de la logique de synchronisation ni de la signification des RSVP. Une invitation Google seule ne donne toujours aucun droit de réponse sur Assolutions.

### Recette LOCAL EXG-32/33
1. Compte administrateur en mode ADMIN : **aucun** lien `Mes calendriers` dans la navbar ; gestion `Calendriers Google` disponible ; un propriétaire de projet non inscrit dans un groupe destinataire ne reçoit pas de calendrier dans `GET /mes`.
2. Compte adhérent **avec** calendrier actif : `Mon menu` propose « Contacter le club » **et** « Mes calendriers » côte à côte sur mobile, et en ligne sur desktop. Compte **sans** calendrier : « Mes calendriers » absent et « Contacter le club » pleine largeur mobile.
3. Sur `/mes-calendriers` mobile : comparer visuellement à `Mon menu` (une carte par séance, pas de scroll horizontal), accès Oui/Non par personne, calendrier partagé/Google/Actualiser iconifiés, ancien événements via horloge.
4. Desktop : tableau conservé avec colonnes et actions d'origine. Partage toujours soumis aux droits Google. Vérifier l'app et les erreurs réseau sur 360–390 px de large.
5. Confirmer compilation isolée backend + frontend PREPROD/PROD, puis recette fonctionnelle LOCAL avant toute promotion PREPROD. Ne pas merger vers master ni modifier PROD.

