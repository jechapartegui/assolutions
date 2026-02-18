import { IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProfesseurDto {
  @IsInt()
  id: number; // personne.id

  @IsOptional()
  @IsNumber()
  hourly_rate?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  num_tva?: string | null;

  @IsOptional()
  @IsInt()
  num_siren?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string | null;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsInt()
  project_id: number;
}

export class UpdateProfesseurDto {
  @IsOptional() @IsNumber() hourly_rate?: number | null;
  @IsOptional() @IsString() @MaxLength(50) status?: string | null;
  @IsOptional() @IsString() @MaxLength(20) num_tva?: string | null;
  @IsOptional() @IsInt() num_siren?: number | null;
  @IsOptional() @IsString() @MaxLength(34) iban?: string | null;
  @IsOptional() @IsString() info?: string | null;
}
