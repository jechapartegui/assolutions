import {
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;

  @IsOptional()
  @IsObject()
  contact?: any;

  @IsOptional()
  @IsObject()
  adresse?: any;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  activite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @Length(7, 7)
  couleur?: string;

  @IsString()
  @MaxLength(50)
  login: string;

  @IsString()
  password: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @IsObject()
  contact?: any | null;

  @IsOptional()
  @IsObject()
  adresse?: any | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  activite?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string | null;

  @IsOptional()
  @IsString()
  logo?: string | null;

  @IsOptional()
  @IsString()
  @Length(7, 7)
  couleur?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
