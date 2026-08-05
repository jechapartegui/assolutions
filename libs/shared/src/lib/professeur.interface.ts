export interface Professeur {
  id: number;         // personne.id
  project_id: number; // côté DB, lié au projet

  hourly_rate?: number | null;
  status?: string | null;
  num_tva?: string | null;
  num_siren?: number | null;
  iban?: string | null;
  info?: string | null;
}

export interface CreateProfesseurDto {
  id: number;
  hourly_rate?: number | null;
  status?: string | null;
  num_tva?: string | null;
  num_siren?: number | null;
  iban?: string | null;
  info?: string | null;
}

export type UpdateProfesseurDto = Partial<Omit<Professeur, 'project_id' | 'id'>>;
