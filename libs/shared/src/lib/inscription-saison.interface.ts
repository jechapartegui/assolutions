export interface InscriptionSaison {
  id: number;
  project_id: number;

  saison_id: number;
  personne_id: number;

  active?: boolean;
}

export type CreateInscriptionSaisonDto = Omit<InscriptionSaison, 'id' | 'project_id'>;
export type UpdateInscriptionSaisonDto = Partial<Omit<InscriptionSaison, 'id' | 'project_id' | 'saison_id' | 'personne_id'>>;
