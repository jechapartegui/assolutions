export interface MailProject {
  project_id: number;

  mail_relance: string;
  mail_annulation: string;
  mail_convocation: string;
  mail_essai: string;

  sujet_relance: string;
  sujet_annulation: string;
  sujet_convocation: string;
  sujet_essai: string;

  mail_vide: string;

  mail_bienvenue?: string;
  sujet_bienvenue?: string;

  mail_serie_seance?: string;
  sujet_serie_seance?: string;
}

export type CreateMailProjectDto = Omit<MailProject, 'project_id'>;
export type UpdateMailProjectDto = Partial<Omit<MailProject, 'project_id'>>;
