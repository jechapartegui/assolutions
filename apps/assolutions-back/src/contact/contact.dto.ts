import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MaxLength(50)
  object_type: string;

  @IsInt()
  object_id: number;

  @IsString()
  @MaxLength(50)
  contact_type: string;

  @IsOptional()
  @IsString()
  contact_value?: string;

  @IsOptional()
  @IsBoolean()
  diffusion?: boolean;

  @IsOptional()
  @IsString()
  contact_list?: string;

  @IsOptional()
  @IsString()
  info?: string;

  @IsBoolean()
  pref: boolean;
}


export class UpdateContactDto {
  @IsString()
  @MaxLength(50)
  object_type: string;

  @IsInt()
  object_id: number;

  @IsString()
  @MaxLength(50)
  contact_type: string;

  @IsOptional()
  @IsString()
  contact_value?: string;

  @IsOptional()
  @IsBoolean()
  diffusion?: boolean;

  @IsOptional()
  @IsString()
  contact_list?: string;

  @IsOptional()
  @IsString()
  info?: string;

  @IsBoolean()
  pref: boolean;
}