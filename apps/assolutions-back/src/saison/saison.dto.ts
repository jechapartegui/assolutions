import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSaisonDto {
  @IsString()
  @MaxLength(10)
  nom: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;

  @IsOptional()
  @IsNumber()
  saison_precedente?: number;
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
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;
  
  @IsOptional()
  @IsNumber()
  saison_precedente?: number;
}
