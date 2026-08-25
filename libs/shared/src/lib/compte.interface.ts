import { Saison } from './saison.interface';

export interface Compte {
  id: number;
  login: string;
  password?: string | null;
  actif?: boolean;
  mail_actif?: boolean;
  activation_token?: string | null;
}

export type CreateCompteDto = {
  login: string;
  password?: string | null;
};

export type UpdateCompteDto = {
  login?: string;
  password?: string | null;
  actif?: boolean;
  mail_actif?: boolean;
  activation_token?: string | null;
};

export class ProjetLogin {
  id: number;
  nom: string;
  actif: boolean;
  date_debut: Date;
  password: string;
  login: string;
}

export type ProjetView = {
  id: number;
  nom: string;
  rights: ProjectRights;
  saison_active: Saison | null;
};

export type MeResponse = {
  compte: Compte;
  projects: ProjetView[];
  token: string;
  mode: AppMode;
};

export type PreLoginResponse = {
  mode: AppMode;
  password_required: boolean;
  /** Legacy account that must define a password before authentication. */
  password_setup_required?: boolean;
};

export type AppMode = 'APPLI' | 'ADMIN';

export type ProjectRights = {
  adherent: boolean;
  prof: boolean;
  visible: boolean;
};

export type Session = {
  token: string;
  mode: AppMode;
  compte: Compte;
  projects: ProjetView[];
  selectedProjectId: number | null;
  rights: ProjectRights | null;
};
