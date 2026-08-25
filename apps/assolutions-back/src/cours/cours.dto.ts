import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCoursDto {
  @IsString()
  @MaxLength(255)
  nom: string;

  @IsString()
  @MaxLength(20)
  jour_semaine: string;

  @IsString()
  @MaxLength(10)
  heure: string;

  @IsInt()
  duree: number;

  @IsInt()
  prof_principal_id: number;

  @IsInt()
  lieu_id: number;

  @IsOptional()
  @IsInt()
  age_minimum?: number | null;

  @IsOptional()
  @IsInt()
  age_maximum?: number | null;

  @IsInt()
  saison_id: number;

  @IsOptional()
  @IsInt()
  place_maximum?: number | null;

  @IsOptional()
  @IsBoolean()
  convocation_nominative?: boolean;

  @IsOptional()
  @IsBoolean()
  afficher_present?: boolean;

  @IsOptional()
  @IsBoolean()
  essai_possible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appointment?: string | null;
}

export class UpdateCoursDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  jour_semaine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  heure?: string;

  @IsOptional()
  @IsInt()
  duree?: number;

  @IsOptional()
  @IsInt()
  prof_principal_id?: number;

  @IsOptional()
  @IsInt()
  lieu_id?: number;

  @IsOptional()
  @IsInt()
  age_minimum?: number | null;

  @IsOptional()
  @IsInt()
  age_maximum?: number | null;

  @IsOptional()
  @IsInt()
  saison_id?: number;

  @IsOptional()
  @IsInt()
  place_maximum?: number | null;

  @IsOptional()
  @IsBoolean()
  convocation_nominative?: boolean;

  @IsOptional()
  @IsBoolean()
  afficher_present?: boolean;

  @IsOptional()
  @IsBoolean()
  essai_possible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appointment?: string | null;
}

export class UpdateCoursSerieDto extends UpdateCoursDto {
  @IsDateString()
  fromDate: string;
}
