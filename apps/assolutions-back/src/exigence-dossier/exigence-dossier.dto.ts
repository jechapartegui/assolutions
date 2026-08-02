import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExigencePorteeDto {
  @IsIn(['GENERAL', 'GROUPE', 'TARIF', 'TYPE_LICENCE'])
  type_portee: 'GENERAL' | 'GROUPE' | 'TARIF' | 'TYPE_LICENCE';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  cible_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cible_code?: string | null;
}

export class SaveExigenceDossierDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  saison_id?: number | null;

  @IsString()
  @MaxLength(80)
  code: string;

  @IsString()
  @MaxLength(255)
  libelle: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsIn(['INSCRIPTION', 'LICENCE'])
  usage: 'INSCRIPTION' | 'LICENCE';

  @IsIn(['CHAMP_PERSONNE', 'CONTACT', 'DOCUMENT', 'CONSENTEMENT', 'DECLARATION'])
  type_exigence:
    | 'CHAMP_PERSONNE'
    | 'CONTACT'
    | 'DOCUMENT'
    | 'CONSENTEMENT'
    | 'DECLARATION';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source_code?: string | null;

  @IsIn(['AUCUNE', 'BOOLEEN', 'TEXTE', 'DATE', 'DOCUMENT'])
  type_reponse: 'AUCUNE' | 'BOOLEEN' | 'TEXTE' | 'DATE' | 'DOCUMENT';

  @IsBoolean()
  obligatoire: boolean;

  @IsBoolean()
  bloquante: boolean;

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
  @Min(1)
  @Type(() => Number)
  validite_mois?: number | null;

  @IsOptional()
  @IsString()
  texte_consentement?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version_texte?: string | null;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  ordre: number;

  @IsBoolean()
  actif: boolean;

  @IsArray()
  @ArrayUnique((item: ExigencePorteeDto) => `${item.type_portee}:${item.cible_id ?? ''}:${item.cible_code ?? ''}`)
  @ValidateNested({ each: true })
  @Type(() => ExigencePorteeDto)
  portees: ExigencePorteeDto[];
}

export class UpdateExigenceDossierDto extends SaveExigenceDossierDto {}
