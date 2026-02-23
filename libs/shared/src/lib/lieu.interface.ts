import { Adresse } from "./adresse.interface";
import { corelistobject } from "./corelistobject.interface";

export class Lieu_VM extends corelistobject {
    adresse: Adresse = new Adresse();
}
export interface Lieu {
  id: number;
  project_id: number;

  nom: string;
  adresse: string;

  public?: boolean;
}

export type CreateLieuDto = Omit<Lieu, 'id' | 'project_id'>;
export type UpdateLieuDto = Partial<Omit<Lieu, 'id' | 'project_id'>>;
