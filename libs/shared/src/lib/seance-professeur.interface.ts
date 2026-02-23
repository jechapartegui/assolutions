export interface SeanceProfesseur {
  id: number;
  project_id: number;

  seance_id: number;
  minutes: number;

  cout?: string | null;
  info?: string | null;

  professeurcontract_id: number;

  statut?: string;
}

export type CreateSeanceProfesseurDto = Omit<SeanceProfesseur, 'id' | 'project_id'>;
export type UpdateSeanceProfesseurDto = Partial<Omit<SeanceProfesseur, 'id' | 'project_id'>>;
