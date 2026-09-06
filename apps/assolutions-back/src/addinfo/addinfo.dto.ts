import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function ToText() {
  return Transform(({ value }) => (value == null ? '' : String(value)));
}

export class CreateAddinfoFieldDto {
  @IsString()
  @MaxLength(50)
  object_type: string;

  @IsString()
  @MaxLength(50)
  value_type: string;

  @ToText()
  @IsString()
  text: string;
}

export class UpdateAddinfoFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  object_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  value_type?: string;

  @IsOptional()
  @ToText()
  @IsString()
  text?: string;
}

export class UpdateAddinfoOptionsDto {
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  options: string[];
}

export class SetAddinfoValueDto {
  @IsString()
  @MaxLength(50)
  object_type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  object_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  field_id: number;

  @ToText()
  @IsString()
  text: string;
}

export class UpdateAddinfoValueDto {
  @IsOptional()
  @ToText()
  @IsString()
  text?: string;
}

export class UpsertLovDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(10)
  lang: string;

  @ToText()
  @IsString()
  text: string;

  @IsOptional()
  @IsBoolean()
  project_specific?: boolean;
}

export class CreateAddInfoValueDto {
  @IsString()
  @MaxLength(50)
  object_type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  object_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  field_id: number;

  @ToText()
  @IsString()
  text: string;
}

export class UpdateAddInfoValueDto {
  @IsOptional()
  @ToText()
  @IsString()
  text?: string;
}
