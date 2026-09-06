import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class BootstrapClubDto {
  @IsString()
  @MaxLength(100)
  club_name: string;

  @IsString()
  @MaxLength(100)
  activity: string;

  @IsEmail()
  @MaxLength(50)
  email: string;

  @IsOptional()
  @IsString()
  password?: string | null;
}
