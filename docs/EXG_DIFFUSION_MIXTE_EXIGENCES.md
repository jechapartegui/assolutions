# EXG-FIX04 — Diffusion mixte des calendriers

## Objectif
Un calendrier de championnat ne doit pas déclencher N invitations Google pour N matchs.
L'administrateur doit gérer les destinataires par groupe, informer une fois, relancer
sélectivement et forcer les invitations individuelles en dernier recours.

## Modes de diffusion par calendrier
- **ABONNEMENT (défaut)** : événements Google sans attendees, aucune invitation par
  événement. Le club communique un lien d'abonnement en un seul message.
- **INVITATIONS** : Google attendees sur les événements. Réservé aux événements
  ponctuels ou à une décision explicite de l'administrateur.
- **MIXTE** : abonnement proposé à tous ; un sous-ensemble de comptes désignés
  reçoit des invitations Google par événement. L'activation « forcée » correspond
  uniquement à ces invitations : Assolutions ne peut pas ajouter secrètement
  un agenda à un compte Google externe.

## Ciblage, suivi et relances
- La liste des destinataires provient des comptes actifs associés aux groupes
  destinataires du calendrier ; dédupliquer par compte et isoler par projet.
- Afficher par compte : nom, adresse, canal choisi, date du dernier message,
  date de confirmation **déclarée** d'abonnement, date de dernière relance.
- Statuts : NON_CONTACTE, PROPOSE, CONFIRME_MANUELLEMENT, INVITATIONS_FORCEES,
  EXCLU. Ne jamais présenter « Google confirme l'abonnement » :
  l'API Calendar ne fournit pas un état d'abonnement universel fiable.
- Action « Proposer l'abonnement » : **un seul mail par compte** contenant nom,
  description et lien ; ne pas réexpédier automatiquement à chaque changement.
- Action « Relancer les non-confirmés » : confirmation explicite admin, uniquement
  comptes sélectionnés non confirmés ; journaliser l'envoi. Limite de cadence.
- Action « Forcer invitations événements » : explicite, ciblée et avertie
  (nombre de séances x nombre de comptes), sans auto-activation en masse.
- Une invitation Google n'est pas une confirmation d'abonnement au calendrier.

## Accès au calendrier
- Le lien Google actuel est un lien d'ouverture pour le propriétaire et non
  une preuve de permission de s'abonner.
- Choisir explicitement entre calendrier public en lecture seule, partage
  nominatif Google, ou flux ICS individuel protégé. Ne pas publier de données
  personnelles ou d'informations réservées dans un calendrier public.
- Les liens Oui/Non Assolutions restent l'unique canal de présence dans le
  mode abonnement. Import RSVP Google uniquement pour les comptes recevant
  de véritables invitations Google.

## Évolutions techniques requises
- Migration additive : diffusion_mode + table calendrier_destinataire (état de
  sollicitation, dates, override d'invitation, audit).
- Mise à jour du worker : ne jamais réintroduire automatiquement tous les
  comptes comme attendees en mode abonnement.
- Protéger la migration des calendriers existants : conserver leur mode courant
  jusqu'à modification explicite ; nouveau calendrier par défaut ABONNEMENT.
- Routes admin pour la liste, les actions ciblées et les journaux d'envoi ;
  contrôle de projet côté backend et protection contre les envois répétés.
- Intégration au service mail existant avec vérification du sandbox PREPROD.
- Vue UI : tableau destinataires, filtres non confirmés, envois ciblés,
  avertissement avant invitations forcées.
- Ne jamais confondre engagement local « confirmé manuellement » et
  preuve Google ; pas d'inscription forcée d'un tiers chez Google.

## Performance : aperçu des réponses Google
- Correctif initial : passer de 100 à 10 événements sur la page interactive et
  exposer un état de chargement.
- Suite : pagination, limite de concurrence à 3 sur API Google, timeouts
  côté serveur, caches de correspondance des comptes, et détails d'erreur.
- Eviter toute action susceptible de bloquer le thread UI et pouvoir fermer
  l'aperçu indépendamment de la requête.

## Critères de recette
1. Calendrier de 6 matchs / 1 membre : aucune invitation Google en mode ABONNEMENT.
2. Proposer abonnement : un seul message, même si 6 matchs.
3. Relancer : uniquement les comptes choisis, journalisation sans doublon.
4. Forcer invitations : seulement les comptes sélectionnés et les séances voulues.
5. Ajout ou retrait du groupe : liste des destinataires recalculée correctement.
6. Réponse Google : aperçu borné, aucun gel sans fin, erreur lisible en cas d'échec.
7. Aucun envoi à de véritables membres depuis PREPROD.
