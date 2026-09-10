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

export class BugReportDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(8000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  screen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  steps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  expected?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  actual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  browser?: string;

  @IsOptional()
  @IsEmail()
  accountEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  version?: string;
}
