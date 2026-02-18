import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePersonneDto {
  @IsDateString()
  date_naissance: string; // YYYY-MM-DD

  @IsInt()
  compte: number;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string | null;

  @IsOptional()
  @IsBoolean()
  gender?: boolean;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsBoolean()
  archive?: boolean;
}

export class UpdatePersonneDto {
  @IsOptional()
  @IsDateString()
  date_naissance?: string;

  @IsOptional()
  @IsInt()
  compte?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string | null;

  @IsOptional()
  @IsBoolean()
  gender?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsBoolean()
  archive?: boolean;
}
