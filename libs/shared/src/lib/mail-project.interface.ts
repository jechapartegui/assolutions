export type MailProjectTemplateType =
  | 'relance'
  | 'annulation'
  | 'convocation'
  | 'essai'
  | 'bienvenue'
  | 'serie_seance'
  | 'vide';

export interface MailProject {
  id: number;
  mail_relance: string;
  mail_annulation: string;
  mail_convocation: string;
  mail_essai: string;
  sujet_relance: string;
  sujet_annulation: string;
  sujet_convocation: string;
  sujet_essai: string;
  mail_vide: string;
  mail_bienvenue: string;
  sujet_bienvenue: string;
  mail_serie_seance: string;
  sujet_serie_seance: string;
}

export interface InitMailProjectDto extends Omit<MailProject, 'id'> {}

export interface UpdateMailProjectTemplateDto {
  sujet: string;
  mail: string;
}

export interface UpdateMailProjectBodylessTemplateDto {
  mail: string;
}

export interface MailProjectTemplateVm {
  type: MailProjectTemplateType;
  sujet: string | null;
  mail: string;
}