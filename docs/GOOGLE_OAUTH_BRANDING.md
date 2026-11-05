# Assolutions — pages publiques Google OAuth (novembre 2026)

La racine https://assolutions.club/ reste l'accès applicatif (redirection vers /fr/ puis connexion).
L'accueil public **distinct** est https://assolutions.club/public/ ; les informations légales
sont https://assolutions.club/confidentialite/ et https://assolutions.club/conditions/.

## Publication OVH

- À la racine du monorepo : `npm run build:prod`.
- Le build frontend inclut les pages HTML autonomes, puis
  `scripts/publish-public-legal-pages.cjs` copie dans
  `dist/apps/assolutions-front-prod/` les répertoires `public/`,
  `confidentialite/`, `conditions/` et le fichier `site.css`.
- Déployer **tout** le contenu de ce répertoire sur le FTP racine OVH
  (pas uniquement `fr/` et `en/`).
- Si le déploiement actuel copie chaque langue séparément, recopier explicitement
  ces quatre éléments à la racine du FTP, sans modifier le `index.html` racine
  ni les règles de redirection de connexion.
- Tester avec une fenêtre privée : `/public/`, `/confidentialite/`,
  `/conditions/`, sans connexion. Les trois pages doivent présenter
  de vrais contenus HTML en affichage direct, pas une page de login.
- Les URL sans barre finale (/public, /confidentialite, /conditions) peuvent
  rediriger vers leur répertoire avec barre finale sur Apache/OVH.

## Google Auth Platform → Branding

- Nom : `Assolutions` (identique à la vitrine).
- Accueil : `https://assolutions.club/public/`
- Confidentialité : `https://assolutions.club/confidentialite/`
- Conditions : `https://assolutions.club/conditions/`
- Domaine autorisé : `assolutions.club`
- Email d'assistance : `assolutions.club@gmail.com`

Google exige la **vérification de propriété du domaine** dans Google Search Console ;
le simple ajout de pages web ne suffit pas. Utiliser idéalement la propriété
de domaine `assolutions.club` et le TXT DNS demandé, chez le fournisseur DNS
du domaine. Le compte propriétaire vérifié doit être lié au projet Google Cloud
(Owner ou Editor). Après validation attendre le temps de propagation indiqué,
puis relancer la vérification de branding.

## OAuth Calendar

La mise en production OAuth ne répare pas un `refresh_token` expiré.
Après publication/vérification de l'application, renouveler l'autorisation
`openid`, `email`, `https://www.googleapis.com/auth/calendar` via
OAuth Playground avec les propres identifiants OAuth Google du projet.
Remplacer le secret **uniquement dans Render**, jamais dans Git.
Tester ensuite la connexion Google en lecture seule ; réactiver ensuite
la réconciliation automatique après synchronisation manuelle réussie.

Aucune modification de base de données n'est nécessaire pour ces pages.
