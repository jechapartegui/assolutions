import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateInscriptionSaisonDto {
  @IsInt()
  saison_id: number;

  @IsInt()
  personne_id: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateInscriptionSaisonDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
