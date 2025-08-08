import { LienGroupe_VM } from "./groupe.interface";
import { PersonneLight_VM } from "./personne.interface";

export class Cours_VM {
  id: number = 0;
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
  rdv?:string;
  // Champs enrichis
  lieu_nom?: string;

  // Professeurs liés
  professeursCours: PersonneLight_VM[] = [];

  // Groupes liés
  groupes: LienGroupe_VM[] =[];
}

export class ContratProfesseur_VM {
  id:number;
  personne:PersonneLight_VM;
  type_contrat:string;
  type_remuneration:string;
}

