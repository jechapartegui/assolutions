import { LienGroupe_VM } from "./groupe.interface";

export class Cours_VM {
  id: number;
  nom: string;
  jour_semaine: string;
  heure: string;
  duree: number;
  prof_principal_id: number;
  lieu_id: number;
  saison_id: number;

  age_minimum?: number;
  age_maximum?: number;
  place_maximum?: number;

  convocation_nominative: boolean;
  afficher_present: boolean;
  est_limite_age_minimum: boolean;
  est_limite_age_maximum: boolean;
  est_place_maximum: boolean;

  // Champs enrichis
  lieu_nom?: string;

  // Professeurs liés
  professeursCours: CoursProfesseurVM[];

  // Groupes liés
  groupes: LienGroupe_VM[];
}

export class CoursProfesseurVM {
  cours_id: number;
  prof_id: number;

  constructor(cours_id: number, prof_id: number) {
    this.prof_id = prof_id;
    this.cours_id = cours_id;
  }
}

