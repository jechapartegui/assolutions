export interface Project {
  id: number;
  compte: number;

  nom: string;
  actif?: boolean;

  date_debut: string;
  date_fin: string;

  contact?: any;
  adresse?: any;

  activite?: string;
  lang?: string;

  logo?: string;
  couleur?: string;

  login: string;

  // souvent pas renvoyé par API, mais présent dans DTO create/update
  password?: string;

  activation_token?: string | null;
}

export type CreateProjectDto = Omit<Project, 'id' | 'compte' | 'activation_token'>;
export type UpdateProjectDto = Partial<Omit<Project, 'id' | 'compte'>>;
