export interface ContratProf {
  id: number;

  saison_id: number;
  professeur_id: number;

  type_contrat: string;
  type_remuneration: string;

  date_debut: string;
  date_fin?: string | null;

  details?: string | null;
}

export type CreateContratProfDto = Omit<ContratProf, 'id'>;
export type UpdateContratProfDto = Partial<Omit<ContratProf, 'id'>>;
