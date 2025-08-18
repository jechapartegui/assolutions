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
  async test(@Headers('projectid') projectId: number, @Body() body: MailInput) {
    if(projectId == -1){projectId = 1}
    const info = await this.mailer.queue(projectId,{
      to: body.to,
      subject: body.subject ?? 'Test envoi local',
      text: body.text ?? 'Ceci est un test (texte).',
      html: body.html ?? '<p><strong>Ceci est un test</strong> (HTML)</p>',
    });
    return { ok: true, messageId: info.messageId };
  }
}
