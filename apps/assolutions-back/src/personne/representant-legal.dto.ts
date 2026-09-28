import { IsEmail, IsString, MaxLength } from 'class-validator';

export class RepresentantLegalDto {
  @IsString() @MaxLength(100) nom: string;
  @IsString() @MaxLength(100) prenom: string;
  @IsEmail() @MaxLength(255) email: string;
  @IsString() @MaxLength(50) telephone: string;
}
