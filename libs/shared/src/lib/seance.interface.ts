import { LienGroupe_VM } from "./groupe.interface";
import { Personne_VM, PersonneLight_VM } from "./personne.interface";


export interface MesSeances_VM {
    seance:Seance_VM
    statutInscription?: 'présent' | 'absent' | 'convoqué' | 'essai'; // Peut être null -> optionnel
    statutPrésence?: 'présent' | 'absent'; // Peut être null -> optionnel
    inscription_id?: number; // Peut être null -> optionnel
  }
  
  export interface AdherentSeance_VM {
    personne:Personne_VM
    mes_seances: MesSeances_VM[];
  }

// shared/models/seance.dto.ts

export class Seance_VM {
  seance_id: number = 0;
  saison_id: number;
  cours: number= 0;
  libelle: string="";
  type_seance: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';
  date_seance: Date = new Date();
  heure_debut: string ="11:00";
  duree_seance: number = 0;
  lieu_id: number = 0;
  statut: 'prévue' | 'réalisée' | 'annulée' = 'prévue';
  age_minimum: number | null = null;
  age_maximum: number | null= null;
  place_maximum: number | null= null;
  essai_possible: boolean = false;
  nb_essai_possible: number | null;
  info_seance: string="";
  convocation_nominative: boolean = false;
  afficher_present: boolean = false;
  rdv: string="";
  est_limite_age_minimum: boolean = false;
  est_limite_age_maximum: boolean = false;
  est_place_maximum: boolean = false;

  lieu_nom?: string; // Nom du lieu, optionnel
  cours_nom?: string; // Nom du cours, optionnel

  // Les entités de lien
  seanceProfesseurs: SeanceProfesseur_VM[] = [];

  groupes: LienGroupe_VM[] = []; // Liste des groupes liés à la séance
}

export enum StatutSeance{
  prévue='prévue', réalisée= 'réalisée', annulée ='annulée'
}

export class SeanceProfesseur_VM {
  id: number;
  seance_id: number;
  personne : PersonneLight_VM;
  statut: 'prévue' | 'réalisée' | 'annulée';
  minutes: number;
  cout:number;
  info: string}

export function calculerHeureFin(heureDebut: string, dureeMinutes: number): string {
  const [hours, minutes] = heureDebut.split(':').map(Number);
  const debut = new Date();
  debut.setHours(hours, minutes, 0, 0);

  // Ajoute la durée
  debut.setMinutes(debut.getMinutes() + dureeMinutes);

  // Reformate en "HH:MM"
  const heure = debut.getHours().toString().padStart(2, '0');
  const minute = debut.getMinutes().toString().padStart(2, '0');

  return `${heure}:${minute}`;
}



