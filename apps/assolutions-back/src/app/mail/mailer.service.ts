import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import Bottleneck from 'bottleneck';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailAccount } from '../../entities/mail-account.entity';
import { MailInput } from '@shared/src/lib/mail-input.interface';
import { MailRecord } from '../../entities/mail-record.entity';
// Si tu chiffrages le mot de passe, décommente la ligne suivante:
// import { decryptSecret } from '../../utils/crypto.util';


type Cached = {
  hash: string;
  transporter: Transporter;
  limiter: Bottleneck;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private cache = new Map<number, Cached>();

  constructor(
    @InjectRepository(MailAccount)
    private readonly repo: Repository<MailAccount>,
    @InjectRepository(MailRecord)
    private readonly reporecord:Repository<MailRecord>
  ) {}

  // Construit un hash simple de conf pour invalider le cache si la conf change
  private confHash(acc: MailAccount) {
    const s = [
      acc.host,
      acc.port,
      acc.secure ? '1' : '0',
      acc.username,
      acc.password_enc,           // si tu chiffrages: le hash changera en cas de nouveau secret
      acc.from_email,
      acc.from_name ?? '',
      String(acc.max_per_minute ?? 30),
    ].join('|');
    return Buffer.from(s).toString('base64');
  }

  private build(acc: MailAccount): Cached {
    const transporter = nodemailer.createTransport({
      host: acc.host ?? 'smtp.gmail.com',
      port: Number(acc.port ?? 587),
      secure: !!acc.secure, // <-- booléen correct (false => 587 STARTTLS)
      auth: {
        user: acc.username,
        // Si password_enc est chiffré: pass: decryptSecret(acc.password_enc),
        pass: acc.password_enc,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      tls: { ciphers: 'TLSv1.2' },
    });

    const perMinute = Number(acc.max_per_minute ?? 30);
    const minTime = Math.ceil(60_000 / Math.max(1, perMinute));
    const limiter = new Bottleneck({ minTime, maxConcurrent: 1 });

    return { hash: this.confHash(acc), transporter, limiter };
  }

  private async getCached(accountId: number): Promise<{ acc: MailAccount; cached: Cached }> {
    const acc = await this.repo.findOne({ where: { id: accountId } });
    if (!acc) {
      throw new Error(`MailAccount #${accountId} introuvable`);
    }
    const hash = this.confHash(acc);
    let cached = this.cache.get(accountId);
    if (!cached || cached.hash !== hash) {
      cached = this.build(acc);
      this.cache.set(accountId, cached);
    }
    return { acc, cached };
  }

  /** Envoi immédiat (par compte) */
  async sendNow(accountId: number, input: MailInput) {
    const { acc, cached } = await this.getCached(accountId);
  console.warn(input);
    const from =
      input.from ??
      (acc.from_name ? `${acc.from_name} <${acc.from_email}>` : acc.from_email) ??
      acc.username;

    const info = await cached.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
      attachments: input.attachments,
    });

    this.logger.log(`Mail envoyé (account #${accountId}) : ${info.messageId}`);
    const rec = new MailRecord();
    rec.record = info.messageId;
    rec.to = input.to.toString();
    await this.reporecord.create(rec);
    return info;
  }

  /** Envoi via file d’attente (limite par minute + retry) */
  async queue(accountId: number = 1, input: MailInput) {
    const { cached } = await this.getCached(accountId);

    return cached.limiter.schedule(async () => {
      let attempt = 0;
      while (attempt < 3) {
        try {
          return await this.sendNow(accountId, input);
        } catch (e: any) {
          attempt++;
          this.logger.warn(
            `Échec envoi acc#${accountId} (tentative ${attempt}) : ${e?.message ?? e}`,
          );
          await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
        }
      }
      throw new Error('Échec envoi après 3 tentatives');
    });
  }
}
