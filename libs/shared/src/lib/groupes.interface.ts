export interface Groupe {
  id: number;
  project_id: number;

  nom: string;
  saison_id: number;

  whatsapp?: string | null;
  visible?: boolean | null;

  /** Âge minimum dans l'année civile de début de saison. */
  age_min?: number | null;

  /** Âge maximum dans l'année civile de début de saison. */
  age_max?: number | null;

  /** Né(e) au plus tôt en : borne basse inclusive, ex. 2008. */
  naissance_avant?: number | null;

  /** Né(e) au plus tard en : borne haute inclusive, ex. 2013. */
  naissance_apres?: number | null;

  /** Nombre maximal d'inscriptions actives dans le groupe. */
  limit_nb?: number | null;
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
