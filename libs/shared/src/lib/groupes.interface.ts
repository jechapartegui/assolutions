export interface Groupe {
  id: number;
  project_id: number;

  nom: string;
  saison_id: number;

  whatsapp?: string | null;
  visible?: boolean | null;
}

export type CreateGroupeDto = Omit<Groupe, 'id' | 'project_id'>;
export type UpdateGroupeDto = Partial<Omit<Groupe, 'id' | 'project_id'>>;

export class LienGroupe_VM {
  id: number;
  nom: string;
  id_lien: number;

  constructor(id: number, nom: string, id_lien: number) {
    this.id = id;
    this.nom = nom;
    this.id_lien = id_lien;
  }
}
