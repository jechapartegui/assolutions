export interface CoursProfesseur {
  id: number;

  cours_id: number;
  contrat_id: number;
}

export type CreateCoursProfesseurDto = Omit<CoursProfesseur, 'id'>;
export type UpdateCoursProfesseurDto = Partial<Omit<CoursProfesseur, 'id'>>;
