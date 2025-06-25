import { LienGroupe_VM } from "./groupe.interface";
import { ProfVM } from "./prof.interface";

export interface MesSeances {
    id: number;
    nom: string;
    date: Date;
    heureDebut: string;
    heureFin: string;
    duree: number;
    lieu: string;
    lieuId: number;
    typeSeance: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';
    coursId?: number;       // Peut être null -> rendu optionnel
    cours?: string;         // Peut être null -> rendu optionnel
    statut: 'prévue' | 'réalisée' | 'annulée';
    professeur: Array<ProfVM>;  // tableau de [id, nom]
    statutInscription?: 'présent' | 'absent' | 'convoqué' | 'essai'; // Peut être null -> optionnel
    statutPrésence?: 'présent' | 'absent'; // Peut être null -> optionnel
    inscription_id?: number; // Peut être null -> optionnel
  }
  
  export interface AdherentSeance {
    id: number;
    nom: string;
    prenom: string;
    surnom: string;
    dateNaissance: Date;
    age: number;
    sexe: boolean; // 0 = femme, 1 = homme
    mes_seances: MesSeances[];
  }

// shared/models/seance.dto.ts

export class SeanceVM {
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
  seanceProfesseurs: SeanceProfesseurVM[];

  groupes: LienGroupe_VM[];
}

export enum StatutSeance{
  prévue='prévue', réalisée= 'réalisée', annulée ='annulée'
}


export class SeanceProfesseurVM {
  id: number;
  seance_id: number;
  professeur_id: number;
  minutes: number;
  taux_horaire: number ;
  minutes_payees: number;
  statut: number; // 0 = à payer, 1 = payé, 2 = en attente
  info: string ;
  prenom:string;
  nom:string;
}
