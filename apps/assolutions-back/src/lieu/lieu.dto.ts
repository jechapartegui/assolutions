import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLieuDto {
  @IsInt()
  project_id: number;

  @IsString()
  @MaxLength(255)
  nom: string;

  @IsString()
  adresse: string;

  @IsOptional()
  @IsBoolean()
  public?: boolean;
}

export class UpdateLieuDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsBoolean()
  public?: boolean;
}
