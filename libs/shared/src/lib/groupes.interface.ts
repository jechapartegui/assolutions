export interface Groupe {
  id: number;
  project_id: number;

  nom: string;
  saison_id: number;

  whatsapp?: string | null;
  visible?: boolean | null;

  /** Âge minimum requis pour proposer le groupe dans le tunnel. */
  age_min?: number | null;

  /** Âge maximum autorisé pour proposer le groupe dans le tunnel. */
  age_max?: number | null;

  /** Année de naissance minimale autorisée. */
  annee_min?: number | null;

  /** Année de naissance maximale autorisée. */
  annee_max?: number | null;

  /** Nombre maximal de personnes dans le groupe. */
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
