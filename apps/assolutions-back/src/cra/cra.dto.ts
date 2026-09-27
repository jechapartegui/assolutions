import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class OpenCraDto {
  @IsInt() contrat_prof_id: number;
  @IsInt() @Min(2000) annee: number;
  @IsInt() @Min(1) @Max(12) mois: number;
}

export class AddCraLigneDto {
  @IsDateString() date: string;
  @IsString() type: string;
  @IsString() libelle: string;
  @IsNumber() quantite: number;
  @IsNumber() taux: number;
}

export class FinalizeFactureDto {
  @IsDateString() date_facture: string;
  @IsOptional() @IsString() numero?: string;
  @IsInt() document_id: number;
}

export class UpdateCraLigneDto {
  @IsNumber() quantite: number;
  @IsNumber() taux: number;
}

export class AddCraSeanceDto {
  @IsInt() seance_id: number;
  @IsNumber() quantite: number;
  @IsNumber() taux: number;
}
