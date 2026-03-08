export interface Saison {
  id: number;
  project_id: number;

  nom: string;
  active?: boolean;

  date_debut: string;
  date_fin: string;
}

export type CreateSaisonDto = Omit<Saison, 'id' | 'project_id'>;
export type UpdateSaisonDto = Partial<Omit<Saison, 'id' | 'project_id'>>;
