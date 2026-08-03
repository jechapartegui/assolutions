import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SavePreuveMedicaleDto {
  @IsInt()
  @Type(() => Number)
  personne_id: number;

  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsIn(['CERTIFICAT', 'QS_SPORT'])
  type_preuve: 'CERTIFICAT' | 'QS_SPORT';

  @IsDateString()
  date_document: string;

  @IsOptional()
  @IsBoolean()
  qs_reponses_negatives?: boolean | null;

  @IsBoolean()
  valable_competition: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  medecin_nom?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  medecin_rpps?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  document_id?: number | null;

  @IsOptional()
  @IsString()
  commentaire?: string | null;
}

export class EvaluerPreuveMedicaleDto {
  @IsInt()
  @Type(() => Number)
  personne_id: number;

  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsIn(['LOISIR', 'COMPETITION'])
  type_licence: 'LOISIR' | 'COMPETITION';
}
