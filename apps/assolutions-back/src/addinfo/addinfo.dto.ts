import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddinfoDto {
  @IsInt()
  object_id: number;

  @IsString()
  @MaxLength(50)
  object_type: string;

  @IsString()
  @MaxLength(50)
  value_type: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsInt()
  project_id?: number | null;
}

export class UpdateAddinfoDto {
  @IsOptional()
  @IsInt()
  object_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  object_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  value_type?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  project_id?: number | null;
}
