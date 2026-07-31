import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTarifInscriptionDto {
  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsString()
  @MaxLength(150)
  nom: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  prix_centimes: number;

  @IsOptional()
  @IsDateString()
  date_debut_validite?: string | null;

  @IsOptional()
  @IsDateString()
  date_fin_validite?: string | null;

  @IsOptional()
  @IsBoolean()
  reinscription?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  paiement_plusieurs_fois?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  age_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  age_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  naissance_avant?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  naissance_apres?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit_nb?: number | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ordre?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  groupe_ids?: number[];
}

export class UpdateTarifInscriptionDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  saison_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  prix_centimes?: number;

  @IsOptional()
  @IsDateString()
  date_debut_validite?: string | null;

  @IsOptional()
  @IsDateString()
  date_fin_validite?: string | null;

  @IsOptional()
  @IsBoolean()
  reinscription?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  paiement_plusieurs_fois?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  age_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  age_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  naissance_avant?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  naissance_apres?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit_nb?: number | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ordre?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  groupe_ids?: number[];
}
