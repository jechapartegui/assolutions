import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { MailAddressVm } from '@shared/lib/mail-input.interface';

import { MailRecordEntity, MailRecordStatus } from '../mail_record/mail_record.entity';
import { ProjectEntity } from '../project/project.entity';
import { BugReportDto, OutgoingMessageDto, SendMessagesDto } from './message.dto';

export interface AutomaticMailOptions {
  to: string;
  subject: string;
  html: string;
  name?: string | null;
  record?: string;
  projectId?: number | null;
}

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
    this.smtpUser =
      process.env.MAIL_SMTP_USER ||
      process.env.SMTP_USER ||
      'assolutions.club@gmail.com';

    const host =
      process.env.MAIL_SMTP_HOST ||
      process.env.SMTP_HOST ||
      'smtp.gmail.com';
    const port = Number(
      process.env.MAIL_SMTP_PORT || process.env.SMTP_PORT || 465,
    );
    const secure =
      String(
        process.env.MAIL_SMTP_SECURE ||
          process.env.SMTP_SECURE ||
          (port === 465 ? 'true' : 'false'),
      ).toLowerCase() === 'true';
    const pass = process.env.MAIL_SMTP_PASS || process.env.SMTP_PASS || '';

    this.sendDelayMs = Number(process.env.MAIL_SEND_DELAY_MS || 2000);
    this.isSandboxMode = this.resolveSandboxMode();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: this.smtpUser, pass },
      connectionTimeout: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS || 10_000),
      greetingTimeout: Number(process.env.MAIL_GREETING_TIMEOUT_MS || 10_000),
      socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT_MS || 20_000),
    });
  }

  async verifyConnection(): Promise<boolean> {
    await this.transporter.verify();
    return true;
  }

  async sendBugReport(projectId: number, dto: BugReportDto): Promise<{ ok: true }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new BadRequestException(`Projet ${projectId} introuvable`);

    const supportEmail = String(
      process.env.BUG_REPORT_EMAIL ||
        process.env.SUPPORT_EMAIL ||
        this.smtpUser,
    ).trim();
    const destination = this.normalizeAddress({
      email: supportEmail,
      name: 'Support Assolutions',
    });
    const severity = String(dto.severity || 'NORMALE').trim().toUpperCase();
    const environmentPrefix = this.isSandboxMode ? '[PREPROD] ' : '';
    const projectLabel = project.nom?.trim() || `Projet ${projectId}`;
    const subject = `${environmentPrefix}[BUG][${severity}] ${projectLabel} - ${dto.title.trim()}`;

    const html = this.automaticTemplate(
      'Signalement de bug Assolutions',
      `
        <p><strong>Projet :</strong> ${this.formatBugReportValue(projectLabel)} (#${projectId})</p>
        <p><strong>Compte :</strong> ${this.formatBugReportValue(dto.accountEmail)}</p>
        <p><strong>Gravité :</strong> ${this.formatBugReportValue(severity)}</p>
        <p><strong>Écran / module :</strong> ${this.formatBugReportValue(dto.screen)}</p>
        <p><strong>Route :</strong> ${this.formatBugReportValue(dto.route)}</p>
        <hr style="border:0;border-top:1px solid #ddd;margin:20px 0">
        <p><strong>Titre :</strong> ${this.formatBugReportValue(dto.title)}</p>
        <p><strong>Description :</strong><br>${this.formatBugReportValue(dto.description)}</p>
        <p><strong>Étapes pour reproduire :</strong><br>${this.formatBugReportValue(dto.steps)}</p>
        <p><strong>Résultat attendu :</strong><br>${this.formatBugReportValue(dto.expected)}</p>
        <p><strong>Résultat obtenu :</strong><br>${this.formatBugReportValue(dto.actual)}</p>
        <hr style="border:0;border-top:1px solid #ddd;margin:20px 0">
        <p style="font-size:12px;color:#666"><strong>Navigateur :</strong> ${this.formatBugReportValue(dto.browser)}</p>
        <p style="font-size:12px;color:#666"><strong>Version :</strong> ${this.formatBugReportValue(dto.version)}</p>
      `,
    );

    try {
      await this.transporter.sendMail({
        from: `"Assolutions" <${this.smtpUser}>`,
        to: this.formatAddress(destination),
        replyTo: dto.accountEmail || undefined,
        subject,
        html,
      });

      await this.traceMail({
        record: 'BUG_REPORT',
        to: destination.email,
        subject,
        projectId,
        status: 'SENT',
      });

      return { ok: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      await this.traceMail({
        record: 'BUG_REPORT',
        to: destination.email,
        subject,
        projectId,
        status: 'FAILED',
        error: message,
      });

      this.logger.error(
        `Échec de l'envoi du signalement de bug du projet ${projectId}: ${message}`,
      );
      throw error;
    }
  }

  async sendPasswordReset(login: string, resetUrl: string): Promise<void> {
    await this.sendAutomaticMail({
      to: login,
      subject: 'Assolutions - Définir votre mot de passe',
      record: 'PASSWORD_RESET',
      html: this.automaticTemplate(
        'Définir votre mot de passe',
        `
          <p>Vous avez demandé à définir ou réinitialiser votre mot de passe Assolutions.</p>
          ${this.actionButton('Définir mon mot de passe', resetUrl)}
          ${this.fallbackLink(resetUrl)}
          <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.</p>
        `,
      ),
    });
  }

  async sendActivationMail(login: string, activationUrl: string): Promise<void> {
    await this.sendAutomaticMail({
      to: login,
      subject: 'Assolutions - Activer votre compte',
      record: 'ACCOUNT_ACTIVATION',
      html: this.automaticTemplate(
        'Bienvenue sur Assolutions',
        `
          <p>Votre compte vient d’être créé.</p>
          <p>Activez-le pour accéder à votre espace :</p>
          ${this.actionButton('Activer mon compte', activationUrl)}
          ${this.fallbackLink(activationUrl)}
          <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.</p>
        `,
      ),
    });
  }

  async sendSouscriptionSuccess(
    email: string,
    personName: string,
    subscriptionId: number,
    projectId?: number,
  ): Promise<void> {
    const project = projectId
      ? await this.projectRepo.findOne({ where: { id: projectId } })
      : null;
    const clubName = project?.nom?.trim() || 'votre club';
    const frontUrl = this.getFrontUrl();
    const loginUrl = `${frontUrl}/fr/login`;
    const tutorialsUrl = `${frontUrl}/fr/tutos/`;
    const displayPerson = personName?.trim() || 'l’adhérent';

    await this.sendAutomaticMail({
      to: email,
      name: personName || null,
      projectId,
      record: `MAIL_SOUSCRIPTION_OK_${subscriptionId}`,
      subject: `${clubName} - inscription confirmée pour ${personName || 'un adhérent'}`,
      html: this.automaticTemplate(
        `Bienvenue à ${clubName} !`,
        `
          <p>Bonne nouvelle : l’inscription de <strong>${this.escapeHtml(displayPerson)}</strong> à <strong>${this.escapeHtml(clubName)}</strong> est bien enregistrée.</p>
          <p>Le paiement est confirmé et l’inscription est maintenant finalisée.</p>

          <div style="margin:24px 0;padding:16px 18px;background:#f4f7fb;border:1px solid #d8e2ee;border-radius:8px">
            <strong>Votre accès Assolutions</strong>
            <p style="margin:8px 0 0">Pour vous connecter, utilisez cette adresse email comme identifiant : <strong>${this.escapeHtml(email)}</strong>.</p>
          </div>

          ${this.actionButton('Accéder à mon espace Assolutions', loginUrl)}

          <p>Depuis votre espace, vous pourrez notamment consulter vos informations, gérer les personnes rattachées à votre compte, suivre les séances et compléter les éventuelles pièces encore attendues.</p>

          <p><strong>Besoin d’un coup de main ?</strong> Nous avons préparé des tutoriels simples pour :</p>
          <ul style="padding-left:20px">
            <li>gérer votre compte ;</li>
            <li>créer ou modifier une personne ;</li>
            <li>comprendre l’inscription et le paiement ;</li>
            <li>gérer les séances, présences et essais.</li>
          </ul>

          ${this.actionButton('Voir les tutoriels utilisateur', tutorialsUrl)}

          <p style="margin-top:28px">À bientôt au club !</p>
        `,
      ),
    });
  }

  async sendSouscriptionFailure(
    email: string,
    personName: string,
    subscriptionId: number,
    projectId?: number,
  ): Promise<void> {
    await this.sendAutomaticMail({
      to: email,
      name: personName || null,
      projectId,
      record: `MAIL_SOUSCRIPTION_KO_${subscriptionId}`,
      subject: `Inscription non finalisée pour ${personName || 'un adhérent'}`,
      html: this.automaticTemplate(
        'Inscription non finalisée',
        `
          <p>Le paiement du dossier <strong>#${subscriptionId}</strong> n’a pas pu être confirmé pour <strong>${this.escapeHtml(personName)}</strong>.</p>
          <p>Aucune inscription ni affectation définitive aux groupes n’a été créée.</p>
          <p>Vous pouvez reprendre le dossier depuis Assolutions et réessayer le paiement.</p>
        `,
      ),
    });
  }

  async sendAutomaticMail(options: AutomaticMailOptions): Promise<void> {
    const original = this.normalizeAddress({
      email: options.to,
      name: options.name ?? null,
    });
    const destination = this.isSandboxMode
      ? this.toYopmailAddress(original)
      : original;
    const subject = this.isSandboxMode
      ? this.prefixTestSubject(options.subject)
      : options.subject;
    const record = (options.record || 'automatic-mail').slice(0, 200);
    const startedAt = Date.now();

    try {
      const info = await this.transporter.sendMail({
        from: `"Assolutions" <${this.smtpUser}>`,
        to: this.formatAddress(destination),
        subject,
        html: options.html,
      });

      if (options.projectId) {
        await this.traceMail({
          record,
          to: destination.email,
          subject,
          projectId: options.projectId,
          status: 'SENT',
        });
      }

      this.logger.log(
        `Mail ${options.record || 'automatique'} envoyé vers ${destination.email} en ${Date.now() - startedAt} ms (${info.messageId || 'sans messageId'})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (options.projectId) {
        await this.traceMail({
          record,
          to: destination.email,
          subject,
          projectId: options.projectId,
          status: 'FAILED',
          error: message,
        });
      }

      this.logger.error(
        `Échec mail ${options.record || 'automatique'} vers ${destination.email} après ${Date.now() - startedAt} ms : ${message}`,
      );
      throw error;
    }
  }

  async send(projectId: number, dto: SendMessagesDto) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new BadRequestException(`Projet ${projectId} introuvable`);

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

        await this.traceMail({
          record: prepared.record,
          to: prepared.traceTo,
          subject: prepared.subject,
          projectId,
          status: 'SENT',
        });
        results.push({
          to: prepared.traceTo,
          subject: prepared.subject,
          success: true,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const traceTo = message?.to?.email || '';
        const traceSubject = message?.subject || '';

        await this.traceMail({
          record: (message?.record || 'mail').slice(0, 200),
          to: traceTo,
          subject: traceSubject,
          projectId,
          status: 'FAILED',
          error: errorMessage,
        });

        this.logger.error(
          `Erreur envoi mail projet ${projectId} vers ${traceTo}: ${errorMessage}`,
        );
        results.push({
          to: traceTo,
          subject: traceSubject,
          success: false,
          error: errorMessage,
        });
      }
      await this.wait(this.sendDelayMs);
    }

    return {
      total: results.length,
      sent: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
      results,
    };
  }

  private prepareMessage(project: ProjectEntity, message: OutgoingMessageDto) {
    const to = this.normalizeAddress(message.to);
    const cc = (message.cc ?? []).map((item) => this.normalizeAddress(item));
    if (project.login) {
      cc.push(this.normalizeAddress({ email: project.login, name: project.nom }));
    }
    const bcc = (message.bcc ?? []).map((item) => this.normalizeAddress(item));
    const finalTo = this.isSandboxMode ? this.toYopmailAddress(to) : to;
    const finalCc = this.isSandboxMode
      ? cc.map((item) => this.toYopmailAddress(item))
      : cc;
    const finalBcc = this.isSandboxMode
      ? bcc.map((item) => this.toYopmailAddress(item))
      : bcc;

    return {
      from: `"${this.escapeDisplayName(project.nom || 'Assolutions')}" <${this.smtpUser}>`,
      to: this.formatAddress(finalTo),
      cc: finalCc.length
        ? finalCc.map((item) => this.formatAddress(item)).join(', ')
        : undefined,
      bcc: finalBcc.length
        ? finalBcc.map((item) => this.formatAddress(item)).join(', ')
        : undefined,
      subject: this.isSandboxMode
        ? this.prefixTestSubject(message.subject)
        : message.subject,
      html: message.html,
      record: (message.record || 'mail').slice(0, 200),
      traceTo: finalTo.email.slice(0, 200),
    };
  }

  private async traceMail(input: {
    record: string;
    to: string;
    subject: string;
    projectId: number;
    status: MailRecordStatus;
    error?: string | null;
  }): Promise<void> {
    try {
      await this.mailRecordRepo.save(
        this.mailRecordRepo.create({
          record: String(input.record || 'mail').slice(0, 200),
          to: String(input.to || '').slice(0, 200),
          subject: String(input.subject || '').slice(0, 200),
          project_id: input.projectId,
          status: input.status,
          error: input.error ? String(input.error).slice(0, 4000) : null,
        }),
      );
    } catch (traceError: unknown) {
      const traceMessage =
        traceError instanceof Error ? traceError.message : String(traceError);
      this.logger.warn(
        `Impossible d'enregistrer la trace mail ${input.record} (${input.status}) : ${traceMessage}`,
      );
    }
  }

  private resolveSandboxMode(): boolean {
    const explicit = process.env.MAIL_SANDBOX;
    if (explicit != null && explicit !== '') {
      return String(explicit).toLowerCase() === 'true';
    }

    const environment = String(
      process.env.APP_ENV || process.env.NODE_ENV || '',
    ).toLowerCase();
    return [
      'local',
      'development',
      'dev',
      'test',
      'recette',
      'preprod',
      'preproduction',
    ].includes(environment);
  }

  private automaticTemplate(title: string, body: string): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;line-height:1.5">
        <div style="padding:20px 24px;background:#1e3a5f;color:white;border-radius:8px 8px 0 0">
          <strong style="font-size:20px">Assolutions</strong>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:0">
          <h1 style="font-size:22px;margin:0 0 20px">${this.escapeHtml(title)}</h1>
          <p>Bonjour,</p>
          ${body}
          <p style="margin-top:28px;color:#666;font-size:13px">Message automatique envoyé par Assolutions.</p>
        </div>
      </div>
    `;
  }

  private actionButton(label: string, url: string): string {
    return `<p style="margin:24px 0"><a href="${this.escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 18px;background:#1e3a5f;color:white;text-decoration:none;border-radius:5px">${this.escapeHtml(label)}</a></p>`;
  }

  private fallbackLink(url: string): string {
    return `<p>Si le bouton ne fonctionne pas, copiez-collez ce lien :</p><p style="word-break:break-all">${this.escapeHtml(url)}</p>`;
  }

  private getFrontUrl(): string {
    const value =
      process.env.FRONT_URL ||
      process.env.HELLOASSO_FRONT_URL ||
      'http://localhost:2211';
    return value.replace(/\/+$/, '');
  }

  private normalizeAddress(address: MailAddressVm): MailAddressVm {
    const email = address.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Adresse email invalide: ${address.email}`);
    }
    return { email, name: address.name?.trim() || null };
  }

  private toYopmailAddress(address: MailAddressVm): MailAddressVm {
    const localPart = address.email.split('@')[0]?.replace(/[^a-z0-9._-]/gi, '');
    if (!localPart) {
      throw new BadRequestException(`Adresse email invalide: ${address.email}`);
    }
    return { ...address, email: `${localPart}@yopmail.com` };
  }

  private prefixTestSubject(subject: string): string {
    return subject.startsWith('TEST : ') ? subject : `TEST : ${subject}`;
  }

  private formatAddress(address: MailAddressVm): string {
    return address.name
      ? `"${this.escapeDisplayName(address.name)}" <${address.email}>`
      : address.email;
  }

  private escapeDisplayName(value: string): string {
    return value.replace(/"/g, "'");
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatBugReportValue(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) return '—';
    return this.escapeHtml(text).replace(/\r?\n/g, '<br>');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
