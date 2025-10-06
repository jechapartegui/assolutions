import { ContratProfesseur_VM } from "./cours.interface";
import { PersonneLight_VM } from "./personne.interface";

export type ContratLight_VM = {
  type_contrat: string;
  type_remuneration: string;
  saison_id: number;
  date_debut: Date;
  date_fin?: Date;
};

// Ta VM prof
export class Professeur_VM  {
  person: PersonneLight_VM;
  taux?: number;
  statut?: string;
  num_tva?: string;
  num_siren?: number;
  iban?: string;
  info?: string;
  contrats: ContratLight_VM[]; // on renvoie [] si non chargés
}

export class ProfSaisonVM {
    prof_id:number;
    saison_id: number;
}