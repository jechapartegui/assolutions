import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClasseComptableDto {
  @IsOptional()
  @IsInt()
  project_id?: number | null;

  @IsOptional()
  @IsInt()
  parent_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  pays?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  lang?: string;

  @IsString()
  @MaxLength(20)
  code: string;

  @IsString()
  @MaxLength(255)
  libelle: string;

  @IsBoolean()
  recette: boolean;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsInt()
  ordre?: number;
}

export class UpdateClasseComptableDto {
  @IsOptional()
  @IsInt()
  project_id?: number | null;

  @IsOptional()
  @IsInt()
  parent_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  pays?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  lang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  libelle?: string;

  @IsOptional()
  @IsBoolean()
  recette?: boolean;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsInt()
  ordre?: number;
}

export class CreateBudgetScenarioDto {
  @IsInt()
  saison_id: number;

  @IsString()
  @MaxLength(255)
  nom: string;

  @IsOptional()
  @IsBoolean()
  scenario_defaut?: boolean;

  @IsOptional()
  @IsString()
  info?: string | null;
}

export class UpdateBudgetScenarioDto {
  @IsOptional()
  @IsInt()
  saison_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @IsOptional()
  @IsBoolean()
  scenario_defaut?: boolean;

  @IsOptional()
  @IsString()
  info?: string | null;
}

export class CreateBudgetLigneDto {
  @IsInt()
  budget_scenario_id: number;

  @IsInt()
  classe_comptable_id: number;

  @IsNumber()
  montant_budget: number;

  @IsOptional()
  @IsString()
  info?: string | null;
}

export class UpdateBudgetLigneDto {
  @IsOptional()
  @IsInt()
  classe_comptable_id?: number;

  @IsOptional()
  @IsNumber()
  montant_budget?: number;

  @IsOptional()
  @IsString()
  info?: string | null;
}

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