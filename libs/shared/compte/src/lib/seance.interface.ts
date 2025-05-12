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
    professeur: Array<[number, string]>;  // tableau de [id, nom]
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