import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCompteBancaireDto {
  @IsInt()
  project_id: number;

  @IsString()
  @MaxLength(255)
  nom: string;

  @IsString()
  @MaxLength(255)
  type: string;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string | null;

  @IsOptional()
  @IsString()
  carte_json?: string | null;

  @IsOptional()
  @IsInt()
  carte_titulaire?: number | null;
}

export class UpdateCompteBancaireDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type?: string;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string | null;

  @IsOptional()
  @IsString()
  carte_json?: string | null;

  @IsOptional()
  @IsInt()
  carte_titulaire?: number | null;
}
