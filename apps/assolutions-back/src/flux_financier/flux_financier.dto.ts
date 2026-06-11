import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFluxFinancierDto {
  @IsString()
  @MaxLength(255)
  libelle: string;

  @IsDateString()
  date: string;

  @IsString()
  destinataire: string;

  @IsBoolean()
  recette: boolean;

  @IsInt()
  statut: number;

  @IsNumber()
  montant: number;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsInt()
  saison_id: number;

  @IsOptional()
  @IsInt()
  classe_comptable_id?: number | null;

  @IsOptional()
  @IsInt()
  nb_paiement?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type_frais?: string | null;

  @IsOptional()
  @IsInt()
  personne_id?: number | null;

  @IsOptional()
  @IsInt()
  contrat_prof_id?: number | null;

  @IsOptional()
  @IsBoolean()
  flux_systeme?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origine?: string | null;
}

export class UpdateFluxFinancierDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  libelle?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  destinataire?: string;

  @IsOptional()
  @IsBoolean()
  recette?: boolean;

  @IsOptional()
  @IsInt()
  statut?: number;

  @IsOptional()
  @IsNumber()
  montant?: number;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsOptional()
  @IsInt()
  saison_id?: number;


  @IsOptional()
  @IsInt()
  classe_comptable_id?: number | null;

  @IsOptional()
  @IsInt()
  nb_paiement?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type_frais?: string | null;

  @IsOptional()
  @IsInt()
  personne_id?: number | null;

  @IsOptional()
  @IsInt()
  contrat_prof_id?: number | null;

  @IsOptional()
  @IsBoolean()
  flux_systeme?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origine?: string | null;
}