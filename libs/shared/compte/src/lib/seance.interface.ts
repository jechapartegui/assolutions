import { prof } from "./prof.interface";

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
    professeur: Array<prof>;  // tableau de [id, nom]
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

  export interface seance {
    seance_id: number;
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
    professeur: Array<prof>;  // tableau de [id, nom]
    ageMin?: number | null; // Peut être null -> optionnel
    ageMax?: number | null; // Peut être null -> optionnel
    placeMax?: number | null; // Peut être null -> optionnel
    essaiPossible?: boolean; // Peut être null -> optionnel
    nbEssaiPossible?: number | null; // Peut être null -> optionnel
    infoSeance?: string; // Peut être null -> optionnel
    convocationNominative?: boolean; // Peut être null -> optionnel
    rdv:string; // Peut être null -> optionnel
    afficherPresent?: boolean; // Peut être null -> optionnel
  }
