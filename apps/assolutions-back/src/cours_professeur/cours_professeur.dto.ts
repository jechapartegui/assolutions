import { IsInt, IsOptional } from 'class-validator';

export class CreateCoursProfesseurDto {
  @IsInt()
  cours_id: number;

  @IsInt()
  contrat_id: number;
}

export class UpdateCoursProfesseurDto {
  @IsOptional()
  @IsInt()
  cours_id?: number;

  @IsOptional()
  @IsInt()
  contrat_id?: number;
}
