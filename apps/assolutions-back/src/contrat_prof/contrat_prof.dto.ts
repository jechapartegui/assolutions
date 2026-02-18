import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContratProfDto {
  @IsInt()
  saison_id: number;

  @IsInt()
  professeur_id: number;

  @IsString()
  @MaxLength(50)
  type_contrat: string;

  @IsString()
  @MaxLength(50)
  type_remuneration: string;

  @IsDateString()
  date_debut: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;

  @IsOptional()
  @IsString()
  details?: string | null;
}

export class UpdateContratProfDto {
  @IsOptional()
  @IsInt()
  saison_id?: number;

  @IsOptional()
  @IsInt()
  professeur_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type_contrat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type_remuneration?: string;

  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;

  @IsOptional()
  @IsString()
  details?: string | null;
}
