import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailInput } from '@shared/src/lib/mail-input.interface';
import { PasswordGuard } from '../guards/password.guard';

@Controller('mail')
export class MailerController {
  constructor(private readonly mailer: MailerService) {}

  /** POST /mail/test  { to, subject, html?, text? } */
@UseGuards(PasswordGuard)
  @Post('mail')
  async Mail(@Headers('projectid') projectId: number, @Body() body: MailInput) {
    this.mailer.Mail(projectId, body)
  }
}
