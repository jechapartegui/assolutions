import { IsIn, IsString, MaxLength } from 'class-validator';

export const MAIL_PROJECT_TEMPLATE_TYPES = [
  'relance',
  'annulation',
  'convocation',
  'essai',
  'bienvenue',
  'serie_seance',
  'vide',
] as const;

export type MailProjectTemplateType = typeof MAIL_PROJECT_TEMPLATE_TYPES[number];

export class InitMailProjectDto {
  @IsString()
  mail_relance: string;

  @IsString()
  mail_annulation: string;

  @IsString()
  mail_convocation: string;

  @IsString()
  mail_essai: string;

  @IsString()
  @MaxLength(100)
  sujet_relance: string;

  @IsString()
  @MaxLength(100)
  sujet_annulation: string;

  @IsString()
  @MaxLength(100)
  sujet_convocation: string;

  @IsString()
  @MaxLength(100)
  sujet_essai: string;

  @IsString()
  mail_vide: string;

  @IsString()
  mail_bienvenue: string;

  @IsString()
  @MaxLength(100)
  sujet_bienvenue: string;

  @IsString()
  mail_serie_seance: string;

  @IsString()
  @MaxLength(100)
  sujet_serie_seance: string;
}

export class UpdateMailProjectTemplateDto {
  @IsString()
  @MaxLength(100)
  sujet: string;

  @IsString()
  mail: string;
}

export class UpdateMailProjectBodylessTemplateDto {
  @IsString()
  mail: string;
}

export class GetMailProjectTemplateParamsDto {
  @IsString()
  @IsIn(MAIL_PROJECT_TEMPLATE_TYPES)
  type: MailProjectTemplateType;
}

export interface MailProjectTemplateVm {
  type: MailProjectTemplateType;
  sujet: string | null;
  mail: string;
}