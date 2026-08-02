import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SouscriptionPersonneChoixDto {
  @IsInt()
  @Type(() => Number)
  personne_id: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  groupe_ids: number[];

  @IsInt()
  @Type(() => Number)
  tarif_inscription_id: number;

  @IsIn(['LOISIR', 'COMPETITION'])
  type_licence: 'LOISIR' | 'COMPETITION';
}

export class SouscriptionPayeurDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  personne_id?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  @MaxLength(250)
  email: string;
}

export class SaveSouscriptionDto {
  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @ValidateNested()
  @Type(() => SouscriptionPayeurDto)
  payeur: SouscriptionPayeurDto;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  nb_echeances: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code_promo?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SouscriptionPersonneChoixDto)
  personnes: SouscriptionPersonneChoixDto[];
}

export class CompleteSouscriptionPersonneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @IsDateString()
  date_naissance: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pays: string;

  @IsEmail()
  @MaxLength(250)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  telephone: string;
}

export class ValidateCodePromoDto {
  @IsInt()
  @Type(() => Number)
  saison_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  tarif_ids: number[];
}

export class SimulerPaiementDto {
  @IsIn(['OK', 'KO'])
  resultat: 'OK' | 'KO';
}
