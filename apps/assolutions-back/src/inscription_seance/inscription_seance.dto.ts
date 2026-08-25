import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateInscriptionSeanceDto {
  @IsInt()
  personne_id: number;

  @IsInt()
  seance_id: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_inscription?: Date | null;

  @IsOptional()
  @IsString()
  statut_inscription?: string | null;

  @IsOptional()
  @IsString()
  statut_seance?: string | null;
}

export class UpdateInscriptionSeanceDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_inscription?: Date | null;

  @IsOptional()
  @IsString()
  statut_inscription?: string | null;

  @IsOptional()
  @IsString()
  statut_seance?: string | null;
}
