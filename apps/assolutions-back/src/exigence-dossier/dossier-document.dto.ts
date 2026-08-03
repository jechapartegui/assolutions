import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SaveDossierDocumentDto {
  @IsInt()
  personne_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  typedoc: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mimetype: string;

  @IsString()
  @IsNotEmpty()
  data_base64: string;

  @IsOptional()
  @IsDateString()
  date_document?: string | null;
}
