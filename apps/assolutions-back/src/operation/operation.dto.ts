import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOperationDto {
  @IsNumber()
  solde: number;

  @IsDateString()
  date_operation: string;

  @IsInt()
  mode: number;

  @IsString()
  destinataire: string;

  @IsBoolean()
  paiement_execute: boolean;

  @IsInt()
  compte_bancaire_id: number;

  @IsInt()
  flux_financier_id: number;

  @IsOptional()
  @IsString()
  info?: string | null;
}

export class UpdateOperationDto {
  @IsOptional() @IsNumber() solde?: number;
  @IsOptional() @IsDateString() date_operation?: string;
  @IsOptional() @IsInt() mode?: number;
  @IsOptional() @IsString() destinataire?: string;
  @IsOptional() @IsBoolean() paiement_execute?: boolean;
  @IsOptional() @IsInt() compte_bancaire_id?: number;
  @IsOptional() @IsInt() flux_financier_id?: number;
  @IsOptional() @IsString() info?: string | null;
}
