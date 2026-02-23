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
