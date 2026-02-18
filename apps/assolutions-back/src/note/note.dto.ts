import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNoteDto {
  // account_id forcé depuis req.user.id
  @IsInt()
  object_id: number;

  @IsString()
  @MaxLength(50)
  object_type: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsInt()
  object_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  object_type?: string;
}
