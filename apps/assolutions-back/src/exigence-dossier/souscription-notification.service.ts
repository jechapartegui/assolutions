import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Contact } from '../contact/contact.entity';
import { HelloAssoService } from '../helloasso/helloasso.service';
import { MessageService } from '../message/message.service';
import { PersonneEntity } from '../personne/personne.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionEvenementEntity } from '../souscription/souscription-evenement.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';

type NotificationKind = 'OK' | 'KO';

type WelcomeTemplate = {
  subject: string;
  html: string;
};

@Injectable()
export class SouscriptionNotificationService {
  private readonly logger = new Logger(SouscriptionNotificationService.name);

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
    private readonly messages: MessageService,
  ) {}

  sendSuccess(subscriptionId: number, projectId: number, accountId: number): Promise<void> {
    return this.sendPerPerson(subscriptionId, projectId, accountId, 'OK');
  }

  sendFailure(subscriptionId: number, projectId: number, accountId: number): Promise<void> {
    return this.sendPerPerson(subscriptionId, projectId, accountId, 'KO');
  }

  async sendCurrentState(
    subscriptionId: number,
    projectId: number,
    accountId: number,
  ): Promise<void> {
    this.runDetached(
      this.processCurrentState(subscriptionId, projectId, accountId),
      `souscription ${subscriptionId}`,
    );
  }

  async sendFromWebhook(payload: unknown): Promise<void> {
    this.runDetached(this.processWebhook(payload), 'webhook HelloAsso');
  }

  private async processWebhook(payload: unknown): Promise<void> {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (!checkoutId) return;

    const subscription = await this.souscriptionRepo.findOne({
      where: { helloasso_checkout_intent_id: checkoutId },
    });
    if (!subscription) return;

    await this.processCurrentState(
      subscription.id,
      subscription.project_id,
      subscription.compte_id,
    );
  }

  private async processCurrentState(
    subscriptionId: number,
    projectId: number,
    accountId: number,
  ): Promise<void> {
    const subscription = await this.souscriptionRepo.findOne({
      where: { id: subscriptionId, project_id: projectId, compte_id: accountId },
    });
    if (!subscription) return;

    if (subscription.statut === 'FINALISEE') {
      await this.sendSuccess(subscriptionId, projectId, accountId);
    } else if (this.isFailureState(subscription.helloasso_payment_state)) {
      await this.sendFailure(subscriptionId, projectId, accountId);
    }
  }

  private async sendPerPerson(
    subscriptionId: number,
    projectId: number,
    accountId: number,
    kind: NotificationKind,
  ): Promise<void> {
    const subscription = await this.souscriptionRepo.findOne({
      where: { id: subscriptionId, project_id: projectId, compte_id: accountId },
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
    const welcomeTemplate = kind === 'OK' ? await this.loadWelcomeTemplate(projectId) : null;

    for (const line of lines) {
      const person = peopleById.get(line.personne_id);
      if (!person) continue;

      const eventType = `MAIL_SOUSCRIPTION_${kind}_${person.id}`;
      const alreadySent = await this.evenementRepo.findOne({
        where: { souscription_id: subscription.id, type_evenement: eventType },
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

      const name = `${person.first_name} ${person.last_name}`.trim();
      try {
        if (kind === 'OK') {
          if (welcomeTemplate) {
            await this.messages.sendAutomaticMail({
              to: email,
              name: name || null,
              projectId,
              record: `MAIL_SOUSCRIPTION_OK_${subscription.id}`,
              subject: welcomeTemplate.subject,
              html: welcomeTemplate.html,
            });
          } else {
            await this.messages.sendSouscriptionSuccess(
              email,
              name,
              subscription.id,
              projectId,
            );
          }
        } else {
          await this.messages.sendSouscriptionFailure(
            email,
            name,
            subscription.id,
            projectId,
          );
        }

        await this.evenementRepo.save(
          this.evenementRepo.create({
            souscription_id: subscription.id,
            type_evenement: eventType,
            details: { personne_id: person.id, email, resultat: kind },
          }),
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Mail ${kind} souscription ${subscription.id} vers ${email}: ${message}`,
        );
      }
    }
  }

  private async loadWelcomeTemplate(projectId: number): Promise<WelcomeTemplate | null> {
    try {
      const rows = (await this.souscriptionRepo.query(
        `SELECT p.nom, mp.mail_bienvenue, mp.sujet_bienvenue
           FROM mail_project mp
           LEFT JOIN project p ON p.id = mp.id
          WHERE mp.id = $1
          LIMIT 1`,
        [projectId],
      )) as Array<{
        nom?: unknown;
        mail_bienvenue?: unknown;
        sujet_bienvenue?: unknown;
      }>;

      const row = rows[0];
      const html = typeof row?.mail_bienvenue === 'string' ? row.mail_bienvenue.trim() : '';
      if (!html) return null;

      const projectName =
        typeof row?.nom === 'string' && row.nom.trim() ? row.nom.trim() : 'Votre club';
      const subject =
        typeof row?.sujet_bienvenue === 'string' && row.sujet_bienvenue.trim()
          ? row.sujet_bienvenue.trim()
          : `${projectName} - Bienvenue au club !`;

      return { subject, html };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template mail_bienvenue indisponible pour le projet ${projectId}, utilisation du mail générique : ${message}`,
      );
      return null;
    }
  }

  private runDetached(task: Promise<void>, context: string): void {
    void task.catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Échec notification ${context}: ${message}`);
    });
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
}
