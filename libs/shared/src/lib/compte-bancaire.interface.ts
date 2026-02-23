import { PersonneLight_VM } from "./personne.interface";

export class CompteBancaire_VM {
id = 0;
project_id = 0;
nom!: string;
type!: string;
info?: string;
actif = true;
iban?: string;
carte?: Record<string, unknown> | null; // parsed cardJson
carte_titulaire_id?:number;
carte_titulaire?: PersonneLight_VM;
}

export interface CompteBancaire {
  id: number;
  project_id: number;

  nom: string;
  type: string;

  info?: string | null;
  actif?: boolean;

  iban?: string | null;
  carte_json?: string | null;
  carte_titulaire?: number | null;
}

export type CreateCompteBancaireDto = Omit<CompteBancaire, 'id' | 'project_id'>;
export type UpdateCompteBancaireDto = Partial<Omit<CompteBancaire, 'id' | 'project_id'>>;
