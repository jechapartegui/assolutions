import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCompteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(50)
  email?: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsBoolean()
  mail_actif?: boolean;

  @IsOptional()
  @IsBoolean()
  echec_connexion?: boolean;

  @IsOptional()
  @IsString()
  activation_token?: string | null;
}

export class CreateCompteWithProjectDto extends CreateCompteDto {
  @IsInt()
  @Min(1)
  project_id: number;
}

export class RegisterCompteWithProjectDto {
  @IsEmail()
  @MaxLength(50)
  email: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @IsOptional()
  @IsBoolean()
  mdp_requis?: boolean;

  @IsInt()
  @Min(1)
  project_id: number;
}

export class UpdateCompteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsBoolean()
  mail_actif?: boolean;

  @IsOptional()
  @IsString()
  activation_token?: string | null;
}
