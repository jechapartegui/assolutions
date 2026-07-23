import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { OutgoingMessageDto, SendMessagesDto } from './message.dto';
import { ProjectEntity } from '../project/project.entity';
import { MailRecordEntity } from '../mail_record/mail_record.entity';
import { MailAddressVm } from '@shared/lib/mail-input.interface';



@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly sendDelayMs: number;
  private readonly smtpUser: string;
  private readonly isSandboxMode: boolean;

  constructor(
    @InjectRepository(MailRecordEntity)
    private readonly mailRecordRepo: Repository<MailRecordEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
  ) {
    this.smtpUser = process.env.MAIL_SMTP_USER || 'assolutions.club@gmail.com';

    const host = process.env.MAIL_SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.MAIL_SMTP_PORT || 465);
    const secure = String(process.env.MAIL_SMTP_SECURE || 'true') === 'true';
    const pass = process.env.MAIL_SMTP_PASS || '';

    this.sendDelayMs = Number(process.env.MAIL_SEND_DELAY_MS || 2000);

    this.isSandboxMode =
      ['development', 'dev', 'test', 'recette'].includes(
        String(process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase(),
      );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: this.smtpUser,
        pass,
      },
    });
  }
  async sendPasswordReset(login: string, resetUrl: string): Promise<void> {
  const to = this.normalizeAddress({
    email: login,
    name: null,
  });

  const finalTo = this.isSandboxMode ? this.toYopmailAddress(to) : to;

  const subject = this.isSandboxMode
    ? this.prefixTestSubject('Assolutions - Définir votre mot de passe')
    : 'Assolutions - Définir votre mot de passe';

  const html = `
    <p>Bonjour,</p>

    <p>
      Vous avez demandé à définir ou réinitialiser votre mot de passe Assolutions.
    </p>

    <p>
      <a href="${resetUrl}" target="_blank">
        Définir mon mot de passe
      </a>
    </p>

    <p>
      Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
    </p>

    <p style="word-break: break-all;">
      ${resetUrl}
    </p>

    <p>
      Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.
    </p>
  `;

  await this.transporter.sendMail({
    from: `"Assolutions" <${this.smtpUser}>`,
    to: this.formatAddress(finalTo),
    subject,
    html,
  });

  this.logger.log(`Mail reset password envoyé vers ${finalTo.email}`);
}

async sendActivationMail(login: string, activationUrl: string): Promise<void> {
  const to = this.normalizeAddress({
    email: login,
    name: null,
  });

  const finalTo = this.isSandboxMode ? this.toYopmailAddress(to) : to;

  const subject = this.isSandboxMode
    ? this.prefixTestSubject('Assolutions - Activer votre compte')
    : 'Assolutions - Activer votre compte';

  const html = `
    <p>Bonjour,</p>

    <p>
      Votre compte Assolutions vient d’être créé.
    </p>

    <p>
      Pour l’activer, cliquez sur le lien ci-dessous :
    </p>

    <p>
      <a href="${activationUrl}" target="_blank">
        Activer mon compte
      </a>
    </p>

    <p>
      Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
    </p>

    <p style="word-break: break-all;">
      ${activationUrl}
    </p>

    <p>
      Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.
    </p>
  `;

  await this.transporter.sendMail({
    from: `"Assolutions" <${this.smtpUser}>`,
    to: this.formatAddress(finalTo),
    subject,
    html,
  });

  this.logger.log(`Mail activation compte envoyé vers ${finalTo.email}`);
}

  async send(projectId: number, dto: SendMessagesDto) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException(`Projet ${projectId} introuvable`);
    }

    const results: {
      to: string;
      subject: string;
      success: boolean;
      error?: string | null;
    }[] = [];
    for (const message of dto.messages) {
      try {
        const prepared = this.prepareMessage(project, message);
        await this.transporter.sendMail({
          from: prepared.from,
          to: prepared.to,
          cc: prepared.cc,
          bcc: prepared.bcc,
          subject: prepared.subject,
          html: prepared.html,
        });

        await this.mailRecordRepo.save(
          this.mailRecordRepo.create({
            record: prepared.record,
            to: prepared.traceTo,
            subject: prepared.subject,
            project_id: projectId,
          }),
        );

        results.push({
          to: prepared.traceTo,
          subject: prepared.subject,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(
          `Erreur envoi mail projet ${projectId} vers ${message?.to?.email}: ${error?.message || error}`,
        );

        results.push({
          to: message?.to?.email || '',
          subject: message?.subject || '',
          success: false,
          error: error?.message || 'Erreur inconnue',
        });
      }

      await this.wait(this.sendDelayMs);
    }

    return {
      total: results.length,
      sent: results.filter((x) => x.success).length,
      failed: results.filter((x) => !x.success).length,
      results,
    };
  }

  private prepareMessage(project: ProjectEntity, message: OutgoingMessageDto) {
    const to = this.normalizeAddress(message.to);
    const cc = [
      ...(message.cc ?? []).map((x) => this.normalizeAddress(x)),
    ];

    if (project.login) {
      cc.push(this.normalizeAddress({ email: project.login, name: project.nom }));
    }

    const bcc = (message.bcc ?? []).map((x) => this.normalizeAddress(x));

    const finalTo = this.isSandboxMode ? this.toYopmailAddress(to) : to;
    const finalCc = this.isSandboxMode ? cc.map((x) => this.toYopmailAddress(x)) : cc;
    const finalBcc = this.isSandboxMode ? bcc.map((x) => this.toYopmailAddress(x)) : bcc;

    const finalSubject = this.isSandboxMode
      ? this.prefixTestSubject(message.subject)
      : message.subject;

    return {
      from: `"${this.escapeDisplayName(project.nom || 'Assolutions')}" <${this.smtpUser}>`,
      to: this.formatAddress(finalTo),
      cc: finalCc.length ? finalCc.map((x) => this.formatAddress(x)).join(', ') : undefined,
      bcc: finalBcc.length ? finalBcc.map((x) => this.formatAddress(x)).join(', ') : undefined,
      subject: finalSubject,
      html: message.html,
      record: (message.record || 'mail').slice(0, 200),
      traceTo: finalTo.email.slice(0, 200),
    };
  }

  private normalizeAddress(address: MailAddressVm): MailAddressVm {
    return {
      email: address.email.trim().toLowerCase(),
      name: address.name?.trim() || null,
    };
  }

  private toYopmailAddress(address: MailAddressVm): MailAddressVm {
    const localPart = address.email.split('@')[0]?.trim();
    if (!localPart) {
      throw new BadRequestException(`Adresse email invalide: ${address.email}`);
    }

    return {
      ...address,
      email: `${localPart}@yopmail.com`,
    };
  }

  private prefixTestSubject(subject: string): string {
    return subject.startsWith('TEST : ') ? subject : `TEST : ${subject}`;
  }

  private formatAddress(address: MailAddressVm): string {
    if (address.name) {
      return `"${this.escapeDisplayName(address.name)}" <${address.email}>`;
    }
    return address.email;
  }

  private escapeDisplayName(value: string): string {
    return value.replace(/"/g, "'");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}