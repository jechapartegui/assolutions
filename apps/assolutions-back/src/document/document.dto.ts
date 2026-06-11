import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  titre: string;

  @IsInt()
  objet_id: number;

  @IsString()
  @MaxLength(25)
  objet_type: string;

  @IsString()
  @MaxLength(25)
  typedoc: string;

  @IsString()
  storage_type: string;

  @IsString()
  @MaxLength(255)
  mimetype: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_path?: string | null;

  @IsOptional()
  @IsString()
  commentaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  auteur?: string | null;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titre?: string;

  @IsOptional()
  @IsInt()
  objet_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  objet_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  typedoc?: string;

  @IsOptional()
  @IsString()
  storage_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimetype?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_path?: string | null;

  @IsOptional()
  @IsString()
  commentaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  auteur?: string | null;
}

export class SetPhotoDto {
  @IsInt()
  objet_id: number;

  @IsString()
  @MaxLength(25)
  objet_type: string;

  @IsOptional()
  @IsString()
  photo?: string | null;
}