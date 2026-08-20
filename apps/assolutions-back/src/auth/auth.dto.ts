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
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword: string;
}

export class ResetTokenDto extends LoginIdentifierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token: string;
}

export class SetPasswordWithTokenDto extends ResetTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword: string;
}
