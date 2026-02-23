export interface LienGroupe {
  id: number;
  project_id: number;

  groupe_id: number;
  object_id: number;
  object_type: string; // max 50
}

export type CreateLienGroupeDto = Omit<LienGroupe, 'id' | 'project_id'>;
export type UpdateLienGroupeDto = Partial<Omit<LienGroupe, 'id' | 'project_id' | 'groupe_id'>>;
