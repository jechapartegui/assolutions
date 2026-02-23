import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

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

  // ✅ supprimé : project_id (vient du header via @ProjectId)

  @IsInt()
  saison_id: number;

  @IsInt()
  classe_comptable: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type_frais?: string | null;
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
  classe_comptable?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type_frais?: string | null;
}
