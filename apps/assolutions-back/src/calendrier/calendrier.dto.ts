import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ArrayUnique, IsIn } from 'class-validator';

export class CreateCalendrierDto {
  @IsInt() @Min(1) saison_id: number;
  @IsString() @MaxLength(255) nom: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsBoolean() notifier_mises_a_jour?: boolean;
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

export class SynchroniserCalendrierDto {
  @IsBoolean() notifier: boolean;
  @IsOptional() @IsIn(['preview', 'execute']) mode?: 'preview' | 'execute';
}
