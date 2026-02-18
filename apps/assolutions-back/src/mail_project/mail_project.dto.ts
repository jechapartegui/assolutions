import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMailProjectDto {
  // id sera forcé depuis x-project-id
  @IsString() mail_relance: string;
  @IsString() mail_annulation: string;
  @IsString() mail_convocation: string;
  @IsString() mail_essai: string;

  @IsString() @MaxLength(100) sujet_relance: string;
  @IsString() @MaxLength(100) sujet_annulation: string;
  @IsString() @MaxLength(100) sujet_convocation: string;
  @IsString() @MaxLength(100) sujet_essai: string;

  @IsString() mail_vide: string;

  @IsOptional() @IsString() mail_bienvenue?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_bienvenue?: string;

  @IsOptional() @IsString() mail_serie_seance?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_serie_seance?: string;
}

export class UpdateMailProjectDto {
  @IsOptional() @IsString() mail_relance?: string;
  @IsOptional() @IsString() mail_annulation?: string;
  @IsOptional() @IsString() mail_convocation?: string;
  @IsOptional() @IsString() mail_essai?: string;

  @IsOptional() @IsString() @MaxLength(100) sujet_relance?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_annulation?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_convocation?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_essai?: string;

  @IsOptional() @IsString() mail_vide?: string;

  @IsOptional() @IsString() mail_bienvenue?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_bienvenue?: string;

  @IsOptional() @IsString() mail_serie_seance?: string;
  @IsOptional() @IsString() @MaxLength(100) sujet_serie_seance?: string;
}
