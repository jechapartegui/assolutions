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
  seance_id: number;
  saison_id: number;
  cours: number;
  libelle: string;
  type_seance: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';
  date_seance: Date;
  heure_debut: string;
  duree_seance: number;
  lieu_id: number;
  statut: 'prévue' | 'réalisée' | 'annulée';
  age_minimum: number | null;
  age_maximum: number | null;
  place_maximum: number | null;
  essai_possible: boolean;
  nb_essai_possible: number | null;
  info_seance: string;
  convocation_nominative: boolean;
  afficher_present: boolean;
  rdv: string;
  est_limite_age_minimum: boolean;
  est_limite_age_maximum: boolean;
  est_place_maximum: boolean;

  lieu_nom?: string; // Nom du lieu, optionnel
  cours_nom?: string; // Nom du cours, optionnel

  // Les entités de lien
  seanceProfesseurs: PersonneLight_VM[];

  groupes: LienGroupe_VM[];
}

export enum StatutSeance{
  prévue='prévue', réalisée= 'réalisée', annulée ='annulée'
}


