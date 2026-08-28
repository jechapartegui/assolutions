ALTER TABLE public.exigence_dossier_portee
  ADD COLUMN IF NOT EXISTS obligatoire_override boolean NULL,
  ADD COLUMN IF NOT EXISTS bloquante_override boolean NULL;

  /*
  Assolutions - ordre tarif / groupes dans le tunnel
  Additif et idempotent.

  false (défaut) : GROUPES -> TARIF
  true            : TARIF -> GROUPES
*/

BEGIN;

ALTER TABLE public.saison
  ADD COLUMN IF NOT EXISTS tarif_avant_groupes boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.saison.tarif_avant_groupes IS
  'false = groupes puis tarif ; true = tarif puis groupes';

COMMIT;

SELECT
  id,
  nom,
  active,
  tarif_avant_groupes
FROM public.saison
ORDER BY id;

2. Maintenant TES exigences : voilà exactement ce que je ferais

Ton état actuel est quasiment parfait pour partir de là.

A. Ta preuve médicale actuelle → en faire la règle STANDARD

Tu as actuellement :

PREUVE_MEDICAL_COMPETITION
Portée : GENERAL
Obligatoire : OUI
Bloquante : OUI
Niveau médical : vide

Je la modifierais, plutôt que la supprimer :

Code : PREUVE_MEDICALE_STANDARD
Libellé : Situation médicale
Utilisation : INSCRIPTION
Nature : PREUVE_MEDICALE
Niveau médical : STANDARD

Obligatoire par défaut : OUI
Bloquante par défaut : OUI

Portée :
GENERAL
Obligatoire : hériter
Blocage : hériter

L'écran permet maintenant explicitement de choisir STANDARD ou COMPETITION.

Cette exigence accepte donc tes 3 cas normaux :

nouveau certificat médical ;
certificat de moins de 3 ans + QS Sport ;
QS Sport seul.

Ça devient ta règle médicale de base pour tout le monde.

B. Créer UNE deuxième exigence médicale COMPÉTITION

C'est ça qui rend le modèle beaucoup plus lisible.

Crée :

Code : PREUVE_MEDICALE_COMPETITION
Libellé : Preuve médicale compatible compétition

Utilisation : LICENCE
Nature : PREUVE_MEDICALE
Niveau médical : COMPETITION

Obligatoire par défaut : OUI
Bloquante par défaut : NON

Pas de portée GENERAL.

Ajoute deux portées :

1. TYPE_LICENCE → COMPETITION
   Obligatoire : hériter
   Blocage : hériter

2. GROUPE → Derby
   Obligatoire : OUI
   Blocage : OUI

Et là c'est vraiment élégant.

Pour une licence compétition normale, la preuve compétition est obligatoire mais n'empêche pas forcément le paiement.

Pour Derby, elle devient obligatoire ET bloquante.

Et une preuve compétition valide, conformément à ce qu'on s'était dit, c'est :

certificat récent
OU
certificat < 3 ans + QS Sport

QS Sport seul = valide STANDARD, mais pas COMPÉTITION.

Le moteur distingue bien aujourd'hui dossier_eligible et compatible_competition.

3. PHOTO : tu modifies simplement l'existante

Ton CSV montre actuellement :

PHOTO
Usage : LICENCE
Obligatoire : OUI
Bloquante : NON
Portée : TYPE_LICENCE = COMPETITION

Ça correspond déjà exactement à :

Licence compétition → photo requise mais pas nécessairement bloquante.

Tu ne changes rien à ça.

Tu ajoutes seulement :

GROUPE → Derby
Obligatoire : OUI
Blocage : OUI

Donc :

Licence compétition hors Derby

Photo obligatoire
mais non bloquante

Derby

Photo obligatoire
ET bloquante

Les surcharges par portée sont justement prévues pour ça, et si plusieurs portées correspondent la règle explicite la plus stricte gagne.

4. DROIT À L'IMAGE : même principe

Actuellement tu as :

FFRS_DROIT_IMAGE
Obligatoire : OUI
Bloquante : NON

Portées :
TYPE_LICENCE LOISIR
TYPE_LICENCE COMPETITION

Je garde tout ça.

J'ajoute :

GROUPE → Derby
Obligatoire : OUI
Blocage : OUI

Et là pour Derby, NON ne suffit pas.

Le moteur considère déjà un consentement comme satisfait uniquement si la personne a effectivement répondu OUI.

Donc tu obtiens bien :

Derby → droit à l'image = OUI obligatoire, sinon inscription bloquée.