import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMailAccountDto {
  @IsInt()
  id: number;

  @IsString()
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  host?: string;

  @IsOptional()
  @IsInt()
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsString()
  @MaxLength(200)
  username: string;

  @IsString()
  password_enc: string;

  @IsString()
  @MaxLength(200)
  from_email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  from_name?: string | null;

  @IsOptional()
  @IsInt()
  max_per_minute?: number;
}

export class UpdateMailAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  host?: string;

  @IsOptional()
  @IsInt()
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  username?: string;

  @IsOptional()
  @IsString()
  password_enc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  from_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  from_name?: string | null;

  @IsOptional()
  @IsInt()
  max_per_minute?: number;
}
