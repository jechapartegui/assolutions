import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSeanceDto {
  @IsInt() saison_id: number;
  @IsOptional() @IsInt() cours?: number | null;
  @IsOptional() @IsString() @MaxLength(255) label?: string | null;
  @IsString() type_seance: string;
  @IsDateString() date_seance: string;
  @IsString() @MaxLength(10) heure_debut: string;
  @IsInt() duree_seance: number;
  @IsInt() lieu_id: number;
  @IsString() statut: string;
  @IsOptional() @IsInt() age_minimum?: number | null;
  @IsOptional() @IsInt() age_maximum?: number | null;
  @IsOptional() @IsInt() place_maximum?: number | null;
  @IsOptional() @IsBoolean() essai_possible?: boolean;
  @IsOptional() @IsInt() nb_essai_possible?: number | null;
  @IsOptional() @IsString() info_seance?: string | null;
  @IsOptional() @IsBoolean() convocation_nominative?: boolean;
  @IsOptional() @IsBoolean() afficher_present?: boolean;
  @IsOptional() @IsString() @MaxLength(255) appointment?: string | null;
  @IsOptional() @IsBoolean() est_limite_age_minimum?: boolean;
  @IsOptional() @IsBoolean() est_limite_age_maximum?: boolean;
  @IsOptional() @IsBoolean() est_place_maximum?: boolean;
}

export class CreateSeanceRangeDto {
  @ValidateNested()
  @Type(() => CreateSeanceDto)
  seances: CreateSeanceDto;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsString()
  jourSemaine: string;
}

export class UpdateSeanceDto {
  @IsOptional() @IsInt() saison_id?: number;
  @IsOptional() @IsInt() cours?: number | null;
  @IsOptional() @IsString() @MaxLength(255) label?: string | null;
  @IsOptional() @IsString() type_seance?: string;
  @IsOptional() @IsDateString() date_seance?: string;
  @IsOptional() @IsString() @MaxLength(10) heure_debut?: string;
  @IsOptional() @IsInt() duree_seance?: number;
  @IsOptional() @IsInt() lieu_id?: number;
  @IsOptional() @IsString() statut?: string;
  @IsOptional() @IsInt() age_minimum?: number | null;
  @IsOptional() @IsInt() age_maximum?: number | null;
  @IsOptional() @IsInt() place_maximum?: number | null;
  @IsOptional() @IsBoolean() essai_possible?: boolean;
  @IsOptional() @IsInt() nb_essai_possible?: number | null;
  @IsOptional() @IsString() info_seance?: string | null;
  @IsOptional() @IsBoolean() convocation_nominative?: boolean;
  @IsOptional() @IsBoolean() afficher_present?: boolean;
  @IsOptional() @IsString() @MaxLength(255) appointment?: string | null;
  @IsOptional() @IsBoolean() est_limite_age_minimum?: boolean;
  @IsOptional() @IsBoolean() est_limite_age_maximum?: boolean;
  @IsOptional() @IsBoolean() est_place_maximum?: boolean;
}
