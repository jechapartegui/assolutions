import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginIdentifierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  login: string;
}

export class LoginDto extends LoginIdentifierDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  newPassword?: string | null;
}

export class ResetTokenDto extends LoginIdentifierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token: string;
}

export class SetPasswordWithTokenDto extends ResetTokenDto {
  @IsString()
  @MaxLength(256)
  newPassword: string;
}
