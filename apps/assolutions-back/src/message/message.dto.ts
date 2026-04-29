import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MailAddressDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string | null;
}

export class OutgoingMessageDto {
  @ValidateNested()
  @Type(() => MailAddressDto)
  to: MailAddressDto;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailAddressDto)
  cc?: MailAddressDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailAddressDto)
  bcc?: MailAddressDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  record?: string | null;
}

export class SendMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutgoingMessageDto)
  messages: OutgoingMessageDto[];
}