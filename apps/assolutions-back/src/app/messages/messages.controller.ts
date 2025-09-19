// messages/messages.controller.ts
import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { MailInput } from '@shared/lib/mail-input.interface';
import { MessagesService } from './messages.services';

@Controller('mail')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  // 1) Génère + envoie une convocation
  @Post('mail_essai')
  MailEssai(@Headers('projectid') projectId: number,@Body() body: { sessionId: number; personId: number }) {
    return this.svc.MailEssai(body.sessionId, body.personId, projectId);
  }
    @Get('get_mail/:type')
  GetMail(@Headers('projectid') projectId: number,@Param() { type }: { type: 'convocation' | 'annulation' }) {
    return this.svc.GetMail(type, projectId);
  }
  @Get('mail_activation/:login')
  MailActivation(@Param() { login }: { login: string }) {
    return this.svc.MailActivation(login);
  }


  // 2) Envoi “brut” (tu passes déjà to/subject/html)
  @Post('mail')
  send(@Headers('projectid') projectId: number, @Body() body: { input: MailInput; fromEmail: string; fromName: string}) {
    return this.svc.sendRaw(body.input, body.fromEmail, body.fromName, projectId);
  }

    @Post('update')
  Update(@Headers('projectid') projectId: number, @Body() body: { template: string, subject:string, type_mail: 'convocation' | 'annulation'| 'relance' | 'libre' | 'essai'}) {
    return this.svc.Update(body.template, body.subject, body.type_mail, projectId);
  }

  
   @Post('mail_convoc_annulation')
  mail_convoc_annulation(@Headers('projectid') projectId: number, @Body() body: { type: string; destinataire:number[], notes:string,seance_id:number}) {
    return this.svc.mail_convoc_annulation(body.type, body.destinataire, body.notes,body.seance_id, projectId);
  }

  @Post('mail_relance')
  mail_relance(@Headers('projectid') projectId: number, @Body() body: { template: string, subject:string, destinataire:number[], variables:Record<string,any>, simuler:boolean }) {
    return this.svc.mail_relance(body.template, body.subject, body.destinataire, body.variables,body.simuler, projectId);
  }
}
