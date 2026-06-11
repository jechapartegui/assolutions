import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOperationDto {
  @IsNumber()
  solde: number;

  @IsDateString()
  date_operation: string;

  @IsOptional()
  @IsDateString()
  date_previsionnelle?: string | null;

  @IsInt()
  mode: number;

  @IsString()
  destinataire: string;

  @IsBoolean()
  paiement_execute: boolean;

  @IsInt()
  compte_bancaire_id: number;

  @IsOptional()
  @IsInt()
  flux_financier_id?: number | null;

  /**
   * Utilisé uniquement si l'opération arrive sans flux.
   * Permet de créer/récupérer le flux système "À classer".
   */
  @IsOptional()
  @IsInt()
  saison_id?: number | null;

  @IsOptional()
  @IsString()
  libelle_bancaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  import_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source_import?: string | null;

  @IsOptional()
  @IsString()
  info?: string | null;
}

export class UpdateOperationDto {
  @IsOptional()
  @IsNumber()
  solde?: number;

  @IsOptional()
  @IsDateString()
  date_operation?: string;

  @IsOptional()
  @IsDateString()
  date_previsionnelle?: string | null;

  @IsOptional()
  @IsInt()
  mode?: number;

  @IsOptional()
  @IsString()
  destinataire?: string;

  @IsOptional()
  @IsBoolean()
  paiement_execute?: boolean;

  @IsOptional()
  @IsInt()
  compte_bancaire_id?: number;

  @IsOptional()
  @IsInt()
  flux_financier_id?: number | null;

  @IsOptional()
  @IsInt()
  saison_id?: number | null;

  @IsOptional()
  @IsString()
  libelle_bancaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  import_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source_import?: string | null;

  @IsOptional()
  @IsString()
  info?: string | null;
}