import { LienGroupe_VM } from "./groupe.interface";
import { PersonneLight_VM } from "./personne.interface";

export class Cours_VM {
  id: number = 0;
  nom: string;
  jour_semaine: string;
  heure: string= "11:00";
  duree: number = 0;
  prof_principal_id: number= 0;
  lieu_id: number= 0;
  saison_id: number= 0;

  age_minimum?: number;
  age_maximum?: number;
  place_maximum?: number;
  essai_possible:boolean =false;

  convocation_nominative: boolean=false;
  afficher_present: boolean=false;
  est_limite_age_minimum: boolean=false;
  est_limite_age_maximum: boolean=false;
  est_place_maximum: boolean=false;
  rdv?:string = "";
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

