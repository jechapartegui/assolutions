import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGroupesDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsInt()
  saison_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  whatsapp?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  age_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  age_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  annee_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  annee_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  limit_nb?: number | null;
}

export class UpdateGroupesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsInt()
  saison_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  whatsapp?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  age_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  age_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  annee_min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  annee_max?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  limit_nb?: number | null;
}
