import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EvaluerDossierPersonneDto {
  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsInt()
  @Type(() => Number)
  personne_id: number;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  groupe_ids: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tarif_inscription_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type_licence?: string | null;
}

export class SauverReponseExigenceDto extends EvaluerDossierPersonneDto {
  @IsInt()
  @Type(() => Number)
  exigence_id: number;

  @IsOptional()
  @IsBoolean()
  valeur_boolean?: boolean | null;

  @IsOptional()
  @IsString()
  valeur_texte?: string | null;

  @IsOptional()
  @IsDateString()
  valeur_date?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  document_id?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  repondu_par_personne_id?: number | null;
}
