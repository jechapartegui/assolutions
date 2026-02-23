export interface InscriptionSeance {
  project_id: number;

  personne_id: number;
  seance_id: number;

  statut_inscription?: string | null;
  statut_seance?: string | null;
}

export type CreateInscriptionSeanceDto = Omit<InscriptionSeance, 'project_id'>;
export type UpdateInscriptionSeanceDto = Partial<Omit<InscriptionSeance, 'project_id' | 'personne_id' | 'seance_id'>>;
