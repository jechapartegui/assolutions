import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLienGroupeDto {
  @IsInt()
  groupe_id: number;

  @IsInt()
  object_id: number;

  @IsString()
  @MaxLength(50)
  object_type: string;
}

export class UpdateLienGroupeDto {
  @IsOptional()
  @IsInt()
  object_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  object_type?: string;
}
