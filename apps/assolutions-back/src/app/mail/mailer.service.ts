import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import Bottleneck from 'bottleneck';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailInput } from '@shared/lib/mail-input.interface';
import { MailRecord } from '../../entities/mail-record.entity';
import { ProjetService } from '../project/project.service';

type Cached = {
  hash: string;
  transporter: Transporter;
  limiter: Bottleneck;
};

type SmtpCfg = {
  host: string;
  port: number;
  secure: boolean;           // true => 465 TLS, false => 587 STARTTLS
  user: string;
  pass: string;
  maxPerMinute: number;
  defaultFromEmail: string;  // fallback si pas de from passé
  defaultFromName?: string;  // fallback
};

@Injectable()
export class MailerService {
  
  private readonly logger = new Logger(MailerService.name);
  private cache: Cached | null = null; // une seule boîte => un seul cache

  constructor(
    @InjectRepository(MailRecord)
    private readonly reporecord: Repository<MailRecord>, private readonly projetserv:ProjetService
  ) {}

async Mail(project_id: number, MI: MailInput) {
  let email = "assolutions.club@gmail.com";
  let name = "AsSolutions";
  if (project_id && project_id > 0) {
    const projet = await this.projetserv.get(project_id);
    email = projet.login;
    name = projet.nom;
  }
  // await ici pour propager proprement erreurs + logs synchrones avec la requête
  return await this.queue(MI, email, name, project_id);
}

  // ----- CONFIG -----
  private getCfg(): SmtpCfg {
    const secureEnv = (process.env.SMTP_SECURE ?? 'false').toString().trim().toLowerCase();
    const secure = secureEnv === 'true' || secureEnv === '1' || secureEnv === 'yes';

    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT ?? (secure ? 465 : 587));
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS ?? '';
    const maxPerMinute = Number(process.env.MAIL_MAX_PER_MINUTE ?? 30);

    if (!user || !pass) {
      throw new Error('SMTP_USER / SMTP_PASS manquants (utilise un mot de passe d’application Gmail)');
    }

    return {
      host,
      port,
      secure,
      user,
      pass,
      maxPerMinute,
      defaultFromEmail: process.env.MAIL_FROM_EMAIL ?? user,
      defaultFromName: process.env.MAIL_FROM_NAME ?? undefined,
    };
  }

  private confHash(cfg: SmtpCfg) {
    const s = [
      cfg.host,
      cfg.port,
      cfg.secure ? '1' : '0',
      cfg.user,
      // ne logge jamais cfg.pass !
      cfg.maxPerMinute,
      cfg.defaultFromEmail,
      cfg.defaultFromName ?? '',
    ].join('|');
    return Buffer.from(s).toString('base64');
  }

  private build(cfg: SmtpCfg): Cached {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure, // false = 587 STARTTLS, true = 465 TLS
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      tls: { ciphers: 'TLSv1.2' },
    });

    const minTime = Math.ceil(60_000 / Math.max(1, cfg.maxPerMinute));
    const limiter = new Bottleneck({ minTime, maxConcurrent: 1 });

    return { hash: this.confHash(cfg), transporter, limiter };
  }

  private getCached(): Cached {
    const cfg = this.getCfg();
    const hash = this.confHash(cfg);

    if (!this.cache || this.cache.hash !== hash) {
      this.logger.debug(`(Re)construction du transport SMTP: host=${cfg.host} port=${cfg.port} secure=${cfg.secure} user=${cfg.user}`);
      this.cache = this.build(cfg);
    }
    return this.cache;
  }

  // ----- ENVOI -----

  /**
   * Envoi immédiat
   * @param input contenu du mail (to, subject, html/text, attachments…)
   * @param email email de l’expéditeur affiché (ex: "no-reply@monclub.fr") — si vide, fallback .env
   * @param name  nom de l’expéditeur affiché (ex: "US Ivry Roller") — si vide, fallback .env
   */
async sendNow(input: MailInput | undefined, email: string, name: string, projectId: number | null) {
  if (!input) {
    throw new Error('MailInput manquant (input est undefined)');
  }
  if (!input.to) {
    throw new Error('Destinataire manquant (input.to est vide)');
  }
  const cfg = this.getCfg();
  const { transporter } = this.getCached();

  const fromDisplay =
    input?.from ??
    (name && email
      ? `${name} <${email}>`
      : cfg.defaultFromName
        ? `${cfg.defaultFromName} <${cfg.defaultFromEmail}>`
        : cfg.defaultFromEmail);

  this.logger.debug(`sendNow: from="${fromDisplay}", to="${Array.isArray(input.to) ? input.to.join(',') : input.to}", subject="${input.subject ?? ''}"`);

  const info = await transporter.sendMail({
    from: fromDisplay,
    to: this.sanitizeRecipient(input.to),
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
    attachments: input.attachments,
  });

  this.logger.log(`Mail envoyé : ${info.messageId}`);

  const rec = new MailRecord();
  rec.record = info.messageId;
  rec.to = Array.isArray(input.to) ? input.to.join(',') : input.to;
  rec.projectId = projectId;
  rec.subject = input.subject ?? (null as any);
  await this.reporecord.save(rec);

  return info;
}


  /**
   * Envoi via file d’attente (limite/min + retry)
   * @param input idem sendNow
   * @param email expéditeur (affiché)
   * @param name  nom expéditeur (affiché)
   */
  async queue(input: MailInput | undefined, email: string, name: string, projectId: number | null = null) {
  const { limiter } = this.getCached();

  if (!input) {
    this.logger.error('queue: input est undefined');
    throw new Error('MailInput manquant');
  }

  // Log avant passage dans le scheduler
  this.logger.debug(`queue: to="${Array.isArray(input.to) ? input.to.join(',') : input.to}", subject="${input.subject ?? ''}", projectId=${projectId ?? 'null'}`);

  return limiter.schedule(async () => {
    let attempt = 0;
    while (attempt < 3) {
      try {
        attempt++;
        this.logger.debug(`queue: tentative ${attempt}`);
        const res = await this.sendNow(input, email, name, projectId);
        this.logger.debug(`queue: succès à la tentative ${attempt}`);
        return res;
      } catch (e: any) {
        this.logger.warn(`Échec envoi (tentative ${attempt}) : ${e?.message ?? e}`);
        await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
      }
    }
    throw new Error('Échec envoi après 3 tentatives.');
  });
}


  private sanitizeRecipient(to: string | string[]): string | string[] {
  // si tu veux activer/désactiver facilement
  const isLocal = process.env.NODE_ENV !== 'production';

  if (!isLocal) return to;

  const suffix = '@yopmail.com';

  if (Array.isArray(to)) {
    return to.map(t => this.rewriteAddress(t, suffix));
  }
  return this.rewriteAddress(to, suffix);
}

private rewriteAddress(to: string, suffix: string): string {
  // Garde le "nom" devant <...> si fourni
  const match = to.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    const localPart = email.split('@')[0];
    return `${name} <${localPart}${suffix}>`;
  } else {
    const localPart = to.split('@')[0];
    return `${localPart}${suffix}`;
  }
}

}
