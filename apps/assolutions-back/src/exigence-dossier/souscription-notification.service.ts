import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { In, Repository } from 'typeorm';

import { Contact } from '../contact/contact.entity';
import { HelloAssoService } from '../helloasso/helloasso.service';
import { PersonneEntity } from '../personne/personne.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionEvenementEntity } from '../souscription/souscription-evenement.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';

type NotificationKind = 'OK' | 'KO';

@Injectable()
export class SouscriptionNotificationService {
  private readonly logger = new Logger(SouscriptionNotificationService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly smtpUser: string;

  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly souscriptionRepo: Repository<SouscriptionEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly ligneRepo: Repository<SouscriptionPersonneEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(SouscriptionEvenementEntity)
    private readonly evenementRepo: Repository<SouscriptionEvenementEntity>,
    private readonly helloAsso: HelloAssoService,
  ) {
    this.smtpUser =
      process.env.MAIL_SMTP_USER ||
      process.env.SMTP_USER ||
      'assolutions.club@gmail.com';
    this.transporter = nodemailer.createTransport({
      host:
        process.env.MAIL_SMTP_HOST ||
        process.env.SMTP_HOST ||
        'smtp.gmail.com',
      port: Number(
        process.env.MAIL_SMTP_PORT || process.env.SMTP_PORT || 587,
      ),
      secure:
        String(
          process.env.MAIL_SMTP_SECURE ||
            process.env.SMTP_SECURE ||
            'false',
        ).toLowerCase() === 'true',
      auth: {
        user: this.smtpUser,
        pass: process.env.MAIL_SMTP_PASS || process.env.SMTP_PASS || '',
      },
    });
  }

  sendSuccess(
    subscriptionId: number,
    projectId: number,
    accountId: number,
  ): Promise<void> {
    return this.sendPerPerson(subscriptionId, projectId, accountId, 'OK');
  }

  sendFailure(
    subscriptionId: number,
    projectId: number,
    accountId: number,
  ): Promise<void> {
    return this.sendPerPerson(subscriptionId, projectId, accountId, 'KO');
  }

  async sendFromWebhook(payload: unknown): Promise<void> {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (!checkoutId) return;

    const subscription = await this.souscriptionRepo.findOne({
      where: { helloasso_checkout_intent_id: checkoutId },
    });
    if (!subscription) return;

    if (subscription.statut === 'FINALISEE') {
      await this.sendSuccess(
        subscription.id,
        subscription.project_id,
        subscription.compte_id,
      );
      return;
    }

    if (this.isFailureState(subscription.helloasso_payment_state)) {
      await this.sendFailure(
        subscription.id,
        subscription.project_id,
        subscription.compte_id,
      );
    }
  }

  private async sendPerPerson(
    subscriptionId: number,
    projectId: number,
    accountId: number,
    kind: NotificationKind,
  ): Promise<void> {
    const subscription = await this.souscriptionRepo.findOne({
      where: {
        id: subscriptionId,
        project_id: projectId,
        compte_id: accountId,
      },
    });
    if (!subscription) return;

    const lines = await this.ligneRepo.find({
      where: { souscription_id: subscription.id },
    });
    const personIds = lines.map((line) => line.personne_id);
    const [people, contacts] = await Promise.all([
      personIds.length
        ? this.personneRepo.find({ where: { id: In(personIds) } })
        : Promise.resolve([]),
      personIds.length
        ? this.contactRepo.find({
            where: { object_type: 'rider', object_id: In(personIds) },
          })
        : Promise.resolve([]),
    ]);
    const peopleById = new Map(people.map((person) => [person.id, person]));

    for (const line of lines) {
      const person = peopleById.get(line.personne_id);
      if (!person) continue;

      const eventType = `MAIL_SOUSCRIPTION_${kind}_${person.id}`;
      const alreadySent = await this.evenementRepo.findOne({
        where: {
          souscription_id: subscription.id,
          type_evenement: eventType,
        },
      });
      if (alreadySent) continue;

      const email =
        contacts.find(
          (contact) =>
            contact.object_id === person.id &&
            contact.contact_type?.trim().toUpperCase() === 'EMAIL' &&
            !!contact.contact_value?.trim(),
        )?.contact_value?.trim() || subscription.payeur_email;
      if (!email) continue;

      const destination = this.sandboxAddress(email);
      const name = `${person.first_name} ${person.last_name}`.trim();

      try {
        await this.transporter.sendMail({
          from: `"Assolutions" <${this.smtpUser}>`,
          to: destination,
          subject: this.subject(
            kind === 'OK'
              ? `Inscription confirmée pour ${name || 'une personne'}`
              : `Inscription non finalisée pour ${name || 'une personne'}`,
          ),
          html:
            kind === 'OK'
              ? this.successBody(subscription, name)
              : this.failureBody(subscription, name),
        });

        await this.evenementRepo.save(
          this.evenementRepo.create({
            souscription_id: subscription.id,
            type_evenement: eventType,
            details: {
              personne_id: person.id,
              destination,
              resultat: kind,
            },
          }),
        );
      } catch (error: any) {
        this.logger.error(
          `Mail ${kind} souscription ${subscription.id} vers ${destination}: ${error?.message || error}`,
        );
      }
    }
  }

  private successBody(subscription: SouscriptionEntity, name: string): string {
    return `
      <p>Bonjour,</p>
      <p>Le paiement du dossier <strong>#${subscription.id}</strong> est confirmé.</p>
      <p>L’inscription de <strong>${this.escape(name)}</strong> est finalisée et ses groupes ont été enregistrés.</p>
      <p>Les éventuelles pièces de licence non bloquantes peuvent encore être complétées depuis Assolutions.</p>
    `;
  }

  private failureBody(subscription: SouscriptionEntity, name: string): string {
    return `
      <p>Bonjour,</p>
      <p>Le paiement du dossier <strong>#${subscription.id}</strong> n’a pas pu être confirmé pour <strong>${this.escape(name)}</strong>.</p>
      <p>Aucune inscription ni affectation définitive aux groupes n’a été créée pour cette personne.</p>
      <p>Vous pouvez reprendre le dossier depuis Assolutions et réessayer le paiement.</p>
    `;
  }

  private isFailureState(value: unknown): boolean {
    return [
      'REFUSED',
      'CANCELED',
      'CANCELLED',
      'FAILED',
      'ERROR',
      'SIMULATED_REFUSED',
    ].includes(String(value ?? '').trim().toUpperCase());
  }

  private sandboxAddress(email: string): string {
    const appEnv = String(
      process.env.APP_ENV || process.env.NODE_ENV || '',
    ).toLowerCase();
    const sandbox =
      String(process.env.MAIL_SANDBOX || '').toLowerCase() === 'true' ||
      ['local', 'development', 'dev', 'test', 'preprod', 'preproduction'].includes(
        appEnv,
      );
    if (!sandbox) return email;
    const localPart =
      email.split('@')[0]?.replace(/[^a-z0-9._-]/gi, '') || 'test';
    return `${localPart}@yopmail.com`;
  }

  private subject(value: string): string {
    const appEnv = String(
      process.env.APP_ENV || process.env.NODE_ENV || '',
    ).toLowerCase();
    return ['local', 'development', 'dev', 'test', 'preprod'].includes(appEnv)
      ? `TEST : ${value}`
      : value;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
