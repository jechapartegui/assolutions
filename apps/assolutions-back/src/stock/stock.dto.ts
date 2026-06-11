import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStockDto {
  @IsOptional()
  @IsNumber()
  qte?: number;

  @IsOptional()
  @IsInt()
  lieu_id?: number | null;

  @IsString()
  lieu_stockage: string;

  @IsOptional()
  @IsInt()
  type_stock_id?: number | null;

  @IsString()
  type_stock: string;

  @IsOptional()
  @IsNumber()
  valeur_achat?: number | null;

  @IsOptional()
  @IsDateString()
  date_achat?: string | null;

  @IsOptional()
  @IsInt()
  flux_financier_id?: number | null;

  @IsString()
  @MaxLength(255)
  libelle: string;

  @IsString()
  info: string;
}

export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  qte?: number;

  @IsOptional()
  @IsInt()
  lieu_id?: number | null;

  @IsOptional()
  @IsString()
  lieu_stockage?: string;

  @IsOptional()
  @IsInt()
  type_stock_id?: number | null;

  @IsOptional()
  @IsString()
  type_stock?: string;

  @IsOptional()
  @IsNumber()
  valeur_achat?: number | null;

  @IsOptional()
  @IsDateString()
  date_achat?: string | null;

  @IsOptional()
  @IsInt()
  flux_financier_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  libelle?: string;

  @IsOptional()
  @IsString()
  info?: string;
}