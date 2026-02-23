import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSeanceProfesseurDto {
  @IsInt()
  seance_id: number;

  @IsInt()
  minutes: number;

  @IsOptional()
  @IsString()
  cout?: string | null;

  @IsOptional()
  @IsString()
  info?: string | null;

  @IsInt()
  professeurcontract_id: number;

  @IsOptional()
  @IsString()
  statut?: string;
}

export class UpdateSeanceProfesseurDto {
  @IsOptional() @IsInt() seance_id?: number;
  @IsOptional() @IsInt() minutes?: number;

  @IsOptional()
  @IsString()
  cout?: string | null;

  @IsOptional() @IsString() info?: string | null;
  @IsOptional() @IsInt() professeurcontract_id?: number;
  @IsOptional() @IsString() statut?: string;
}
