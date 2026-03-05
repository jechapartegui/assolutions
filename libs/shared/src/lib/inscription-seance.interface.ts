import { Personne_VM } from "./personne.interface";

export interface InscriptionSeance {
  project_id: number;

  personne_id: number;
  seance_id: number;

  statut_inscription?: InscriptionStatus_VM | null;
  statut_seance?: SeanceStatus_VM | null;
  date_inscription?: Date | null;
}

export type CreateInscriptionSeanceDto = Omit<InscriptionSeance, 'project_id'>;
export type UpdateInscriptionSeanceDto = Partial<Omit<InscriptionSeance, 'project_id' | 'personne_id' | 'seance_id'>>;

export interface FullInscriptionSeance_VM extends InscriptionSeance {

    person: Personne_VM;
    isVisible:boolean; 
}

export enum InscriptionStatus_VM {
  PRESENT = 'présent',
  ABSENT = 'absent',
  CONVOQUE = 'convoqué',
  ESSAI = 'essai',
}

export enum SeanceStatus_VM {
  PRESENT = 'présent',
  ABSENT = 'absent',
}