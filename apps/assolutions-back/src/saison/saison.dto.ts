import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSaisonDto {
  @IsString()
  @MaxLength(10)
  nom: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsInt()
  project_id: number;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;
}

export class UpdateSaisonDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nom?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  project_id?: number;

  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;
}
