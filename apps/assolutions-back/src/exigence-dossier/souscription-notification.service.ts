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

@Injectable()
export class SouscriptionNotificationService {
  private readonly logger = new Logger(SouscriptionNotificationService.name);
  private readonly usIvryProjectId = Number(process.env.US_IVRY_PROJECT_ID || 1);
  private readonly usIvryWhatsappUrl =
    'https://chat.whatsapp.com/HnFOyWlWjTzCnlVVjOza15';

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
          if (Number(projectId) === this.usIvryProjectId) {
            await this.sendUsIvryWelcomeEmail(
              email,
              name,
              subscription.id,
              projectId,
            );
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

  private async sendUsIvryWelcomeEmail(
    email: string,
    personName: string,
    subscriptionId: number,
    projectId: number,
  ): Promise<void> {
    const frontUrl = this.getFrontUrl();
    const loginUrl = `${frontUrl}/fr/login`;
    const tutorialsUrl = `${frontUrl}/fr/tutos/`;
    const displayPerson = personName?.trim() || 'l’adhérent';

    await this.messages.sendAutomaticMail({
      to: email,
      name: personName || null,
      projectId,
      record: `MAIL_SOUSCRIPTION_OK_${subscriptionId}`,
      subject: `US Ivry Roller - Bienvenue au club, ${personName || 'votre inscription est confirmée'} !`,
      html: this.buildUsIvryWelcomeTemplate(
        displayPerson,
        email,
        loginUrl,
        tutorialsUrl,
      ),
    });
  }

  private buildUsIvryWelcomeTemplate(
    personName: string,
    email: string,
    loginUrl: string,
    tutorialsUrl: string,
  ): string {
    const safeName = this.escapeHtml(personName);
    const safeEmail = this.escapeHtml(email);
    const whatsappUrl = this.escapeHtml(this.usIvryWhatsappUrl);
    const safeLoginUrl = this.escapeHtml(loginUrl);
    const safeTutorialsUrl = this.escapeHtml(tutorialsUrl);

    return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bienvenue à l’US Ivry Roller</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.55">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f4f5">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden">
          <tr>
            <td style="background:#111111;padding:30px 32px 26px;border-bottom:6px solid #d71920;color:#ffffff">
              <div style="font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#ffb4b7;margin-bottom:8px">US Ivry Roller</div>
              <div style="font-size:28px;line-height:1.2;font-weight:800">Bienvenue au club ! 🛼</div>
              <div style="font-size:15px;color:#e4e4e7;margin-top:8px">Votre inscription est confirmée. La saison peut commencer !</div>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px">
              <p style="margin:0 0 16px">Bonjour,</p>

              <p style="margin:0 0 16px">Bonne nouvelle : l’inscription de <strong>${safeName}</strong> à l’<strong>US Ivry Roller</strong> est bien enregistrée et finalisée.</p>

              <p style="margin:0 0 22px">Toute l’équipe du club est heureuse de vous accueillir pour cette nouvelle saison. On espère surtout que vous prendrez plaisir à rouler, progresser, essayer de nouvelles disciplines et partager de bons moments avec nous.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fff5f5;border:1px solid #fecaca;border-left:5px solid #d71920;border-radius:10px;margin:22px 0">
                <tr>
                  <td style="padding:18px 20px">
                    <div style="font-size:18px;font-weight:800;color:#111111;margin-bottom:8px">💬 Rejoignez la communauté WhatsApp</div>
                    <div style="font-size:14px;color:#3f3f46">C’est là que nous partageons les annonces du club et les informations utiles au quotidien. Vous y trouverez aussi des <strong>groupes dédiés aux différentes sections et pratiques</strong> : rejoignez simplement ceux qui vous concernent.</div>
                    <div style="margin-top:18px">
                      <a href="${whatsappUrl}" target="_blank" style="display:inline-block;padding:12px 18px;background:#d71920;color:#ffffff;text-decoration:none;border-radius:7px;font-weight:800">Rejoindre la communauté WhatsApp</a>
                    </div>
                    <div style="margin-top:12px;font-size:12px;color:#71717a;word-break:break-all">${whatsappUrl}</div>
                  </td>
                </tr>
              </table>

              <h2 style="font-size:19px;margin:28px 0 12px;color:#111111">📲 Votre espace Assolutions</h2>
              <p style="margin:0 0 12px">Votre espace vous permet de retrouver les séances, les lieux, les convocations et les informations du club, d’indiquer vos présences et de gérer les personnes rattachées à votre compte.</p>

              <p style="margin:0 0 18px">Pour vous connecter, utilisez cette adresse comme identifiant : <strong>${safeEmail}</strong>.</p>

              <div style="margin:18px 0 8px">
                <a href="${safeLoginUrl}" target="_blank" style="display:inline-block;padding:12px 18px;background:#111111;color:#ffffff;text-decoration:none;border-radius:7px;font-weight:800">Ouvrir Assolutions</a>
              </div>

              <h2 style="font-size:19px;margin:28px 0 12px;color:#111111">🧭 Besoin d’un coup de main ?</h2>
              <p style="margin:0 0 12px">Des tutoriels sont disponibles pour prendre en main votre compte, vos informations, les séances, les présences et les inscriptions.</p>
              <p style="margin:0 0 22px"><a href="${safeTutorialsUrl}" target="_blank" style="color:#d71920;font-weight:700;text-decoration:none">Voir les tutoriels utilisateur →</a></p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#18181b;border-radius:10px;margin-top:26px">
                <tr>
                  <td style="padding:18px 20px;color:#ffffff">
                    <div style="font-size:16px;font-weight:800;margin-bottom:5px">Une question ? Une envie de participer ?</div>
                    <div style="font-size:14px;color:#d4d4d8">Le club vit grâce à ses bénévoles et à ses adhérents. N’hésitez pas à nous contacter depuis Assolutions ou à venir échanger avec nous pendant les cours.</div>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 6px">Nous sommes très heureux de vous compter parmi nous.</p>
              <p style="margin:0 0 24px"><strong>À très vite sur les patins ! 🛼🔥</strong></p>

              <p style="margin:0"><strong>Sportivement,</strong><br>
              <strong>Jean-Emmanuel Chapartegui</strong><br>
              Président de l’US Ivry Roller</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background:#f4f4f5;text-align:center;color:#71717a;font-size:12px;border-top:1px solid #e4e4e7">
              Message automatique envoyé par Assolutions pour l’US Ivry Roller.<br>
              Pensez à conserver ce message : il contient les principaux liens utiles pour démarrer la saison.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getFrontUrl(): string {
    const value =
      process.env.FRONT_URL ||
      process.env.HELLOASSO_FRONT_URL ||
      'https://assolutions.club';
    return value.replace(/\/+$/, '');
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
