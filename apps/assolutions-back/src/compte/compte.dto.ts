import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCompteDto {
  @IsString()
  @MaxLength(50)
  login: string;

  @IsOptional()
  @IsString()
  password?: string | null;
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
