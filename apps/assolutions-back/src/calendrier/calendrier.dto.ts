import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ArrayUnique, IsIn, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCalendrierDto {
  @IsInt() @Min(1) saison_id: number;
  @IsString() @MaxLength(255) nom: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsBoolean() notifier_mises_a_jour?: boolean;
  @IsOptional() @IsIn(['ABONNEMENT', 'INVITATIONS', 'MIXTE']) diffusion_mode?: 'ABONNEMENT' | 'INVITATIONS' | 'MIXTE';
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) groupe_ids?: number[];
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) seance_ids?: number[];
}

export class UpdateCalendrierDto {
  @IsOptional() @IsString() @MaxLength(255) nom?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsBoolean() notifier_mises_a_jour?: boolean;
  @IsOptional() @IsBoolean() actif?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) groupe_ids?: number[];
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) seance_ids?: number[];
}

/** EXG-UI-02 : réponse Assolutions pour une personne de SON compte. */
export class RepondreCalendrierEvenementDto {
  @IsInt() @Min(1) personne_id: number;
  @IsIn(['présent', 'absent']) reponse: 'présent' | 'absent';
}

export class SynchroniserCalendrierDto {
  @IsBoolean() notifier: boolean;
  @IsOptional() @IsIn(['preview', 'execute']) mode?: 'preview' | 'execute';
}

export class GoogleReponseCandidateDto {
  @IsInt() @Min(1) seance_id: number;
  @IsInt() @Min(1) personne_id: number;
  @IsString() @MaxLength(255) google_email: string;
  @IsIn(['accepted', 'declined']) google_reponse: 'accepted' | 'declined';
}

export class CalendrierDestinataireActionDto {
  @IsInt() @Min(1) compte_id: number;
  @IsIn(['CONFIRME_MANUELLEMENT', 'INVITATIONS_FORCEES', 'NON_CONTACTE', 'EXCLU'])
  action: 'CONFIRME_MANUELLEMENT' | 'INVITATIONS_FORCEES' | 'NON_CONTACTE' | 'EXCLU';
}

export class ImportGoogleReponsesDto {
  @IsArray() @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => GoogleReponseCandidateDto)
  lignes: GoogleReponseCandidateDto[];
}
