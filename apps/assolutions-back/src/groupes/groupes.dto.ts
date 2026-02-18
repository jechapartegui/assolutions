import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupesDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsInt()
  saison_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  whatsapp?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean | null;
}

export class UpdateGroupesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsInt()
  saison_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  whatsapp?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean | null;
}
