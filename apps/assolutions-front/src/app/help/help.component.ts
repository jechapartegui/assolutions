import { Component } from '@angular/core';
import { AppStore } from '../app.store';

type HelpAudience = 'PERSONNE' | 'PROF' | 'ADMIN';

type HelpTopic = {
  label: string;
  icon: string;
  audiences: HelpAudience[];
  description: string;
  points: string[];
};

@Component({
  standalone: false,
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css'],
})
export class HelpComponent {
  readonly topics: HelpTopic[] = [
    {
      label: $localize`Gérer mon compte`,
      icon: 'fa-user-gear',
      audiences: ['PERSONNE', 'PROF', 'ADMIN'],
      description: $localize`Retrouver et mettre à jour les informations liées à votre compte et aux personnes rattachées.`,
      points: [
        $localize`Ouvrez « Mon compte » depuis la barre de navigation.`,
        $localize`Sélectionnez une personne pour vérifier ou compléter sa fiche.`,
        $localize`Les informations obligatoires manquantes sont signalées avant une inscription.`,
      ],
    },
    {
      label: $localize`Gérer mes présences`,
      icon: 'fa-calendar-check',
      audiences: ['PERSONNE', 'PROF', 'ADMIN'],
      description: $localize`Consulter les prochaines séances et indiquer une présence ou une absence.`,
      points: [
        $localize`Depuis « Mon menu », choisissez la personne concernée.`,
        $localize`Utilisez les icônes de présence directement sur la séance.`,
        $localize`Une convocation nominative apparaît même lorsque la séance est hors des critères habituels du groupe.`,
      ],
    },
    {
      label: $localize`Gérer mes inscriptions`,
      icon: 'fa-id-card',
      audiences: ['PERSONNE', 'PROF', 'ADMIN'],
      description: $localize`Inscrire une ou plusieurs personnes, choisir les groupes, le tarif et compléter le dossier.`,
      points: [
        $localize`L'étape « Personnes » permet aussi d'ajouter une nouvelle personne au compte.`,
        $localize`Les groupes et tarifs proposés tiennent compte des règles d'éligibilité.`,
        $localize`Le dossier doit être complet avant la validation et le paiement.`,
      ],
    },
    {
      label: $localize`Gérer les adhérents`,
      icon: 'fa-users',
      audiences: ['PROF', 'ADMIN'],
      description: $localize`Créer, rechercher et modifier les personnes suivies par le club.`,
      points: [
        $localize`Utilisez la liste des adhérents puis ouvrez une fiche pour la modifier.`,
        $localize`Les contacts, adresses, représentants et informations complémentaires sont centralisés dans la fiche.`,
        $localize`La saison consultée peut être différente de la saison active depuis l'administration.`,
      ],
    },
    {
      label: $localize`Gérer les séances et les cours`,
      icon: 'fa-chalkboard-user',
      audiences: ['PROF', 'ADMIN'],
      description: $localize`Préparer les cours récurrents puis administrer les séances qui en découlent.`,
      points: [
        $localize`Un cours porte les paramètres communs : jour, heure, lieu, groupes et encadrants.`,
        $localize`Le bouton « Modifier la série » réapplique le cours aux séances futures.`,
        $localize`Une séance reste modifiable individuellement pour gérer une exception.`,
      ],
    },
    {
      label: $localize`Gérer les groupes`,
      icon: 'fa-layer-group',
      audiences: ['PROF', 'ADMIN'],
      description: $localize`Organiser les adhérents par groupes et définir leurs règles d'accès.`,
      points: [
        $localize`Créez ou modifiez un groupe depuis l'écran « Groupes ».`,
        $localize`Ajoutez ou retirez les personnes rattachées au groupe.`,
        $localize`Les limites d'âge, d'année de naissance et de capacité peuvent rester facultatives.`,
      ],
    },
    {
      label: $localize`Piloter une séance`,
      icon: 'fa-clipboard-check',
      audiences: ['PROF', 'ADMIN'],
      description: $localize`Suivre les convocations et présences le jour de la séance.`,
      points: [
        $localize`Ouvrez la séance depuis « Séances » ou depuis « Mon menu ».`,
        $localize`Ajoutez une personne nominativement si elle doit participer exceptionnellement.`,
        $localize`Les changements de statut peuvent déclencher les messages configurés pour le club.`,
      ],
    },
  ];

  constructor(public readonly store: AppStore) {}

  get audience(): HelpAudience {
    if (this.store.isAdmin()) return 'ADMIN';
    if (this.store.isProf()) return 'PROF';
    return 'PERSONNE';
  }

  get visibleTopics(): HelpTopic[] {
    return this.topics.filter((topic) => topic.audiences.includes(this.audience));
  }
}
