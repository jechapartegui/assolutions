import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateInscriptionSeanceDto {
  @IsInt()
  personne_id: number;

  @IsInt()
  seance_id: number;

  @IsOptional()
  @IsString()
  statut_inscription?: string | null;

  @IsOptional()
  @IsString()
  statut_seance?: string | null;
}

export class UpdateInscriptionSeanceDto {
  @IsOptional()
  @IsString()
  statut_inscription?: string | null;

  @IsOptional()
  @IsString()
  statut_seance?: string | null;
}
