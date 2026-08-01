import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveCodePromoDto {
  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(150)
  libelle: string;

  @IsIn(['POURCENTAGE', 'MONTANT'])
  type_remise: 'POURCENTAGE' | 'MONTANT';

  @IsInt()
  @Min(1)
  @Type(() => Number)
  valeur: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  montant_min_centimes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_remise_centimes?: number | null;

  @IsOptional()
  @IsDateString()
  date_debut?: string | null;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit_nb?: number | null;

  @IsBoolean()
  actif: boolean;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  tarif_ids: number[];
}

export class UpdateCodePromoDto extends SaveCodePromoDto {}
