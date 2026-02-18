import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMailRecordDto {
  @IsString()
  @MaxLength(200)
  record: string;

  @IsString()
  @MaxLength(200)
  to: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsOptional()
  @IsInt()
  project_id?: number | null;
}

export class UpdateMailRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  record?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsInt()
  project_id?: number | null;
}
