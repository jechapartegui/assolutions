import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { PersonneApiService } from './personne-api.service';
import { AppStore } from '../app/app.store';
import { MenuStore } from '../store/menu.store';
import { RefDataStore } from '../store/ref-data.store';
import {
  OutgoingMessageVm,
  SendMessagesDto,
  SendMessagesResultVm,
} from '@shared/lib/mail-input.interface';

type LegacyOutgoingMessageVm = OutgoingMessageVm & {
  to_person_id?: number;
  body?: string;
  project_id?: number;
};

@Injectable({ providedIn: 'root' })
export class MessageApiService {
  private readonly base = '/messages';

  constructor(
    private api: ApiClientService,
    private personneApi: PersonneApiService,
    private appStore: AppStore,
    private menuStore: MenuStore,
    private refDataStore: RefDataStore,
  ) {}

  send(message: OutgoingMessageVm): Promise<SendMessagesResultVm> {
    return this.sendMany([message]);
  }

  async sendMany(messages: OutgoingMessageVm[]): Promise<SendMessagesResultVm> {
    const normalizedMessages = await this.normalizeMessages(messages);
    const dto: SendMessagesDto = { messages: normalizedMessages };
    return this.api.POST<SendMessagesResultVm>(`${this.base}/send`, dto);
  }

  /**
   * Compatibilité avec les anciens écrans Assolutions (notamment Ma séance)
   * qui transmettaient un to_person_id + body au lieu de l'adresse email + html.
   * On convertit ici vers le contrat strict de l'API sans réouvrir le DTO backend.
   */
  private async normalizeMessages(
    messages: OutgoingMessageVm[],
  ): Promise<OutgoingMessageVm[]> {
    const legacyMessages = messages as LegacyOutgoingMessageVm[];

    const personIds = [
      ...new Set(
        legacyMessages
          .filter((message) => !String(message.to?.email ?? '').trim())
          .map((message) => Number(message.to_person_id ?? 0))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const personnes = personIds.length
      ? await this.personneApi.list_by_id(personIds)
      : [];
    const personnesById = new Map(
      personnes.map((personne) => [Number(personne.id), personne]),
    );

    return legacyMessages.map((message) => {
      const personId = Number(message.to_person_id ?? 0);
      const personne = personnesById.get(personId);
      const email = String(message.to?.email || personne?.login || '').trim();
      const legacyBody = String(message.body ?? '');

      if (!email) {
        throw new Error(
          `Aucune adresse mail trouvée pour ${message.to?.name || `la personne #${personId}`}`,
        );
      }

      const initialHtml = this.isHtmlDocument(legacyBody)
        ? legacyBody
        : message.html || legacyBody;

      return {
        to: {
          email,
          name: message.to?.name ?? null,
        },
        subject: message.subject,
        // Ma séance fournit encore deux représentations : `body` contient le
        // template HTML original alors que `html` peut contenir ce même document
        // échappé (&lt;html&gt;), ce qui affiche le code source dans le mail.
        // Pour un vrai document HTML, on conserve donc le template original.
        html: this.enrichTrialConfirmation(message.subject, initialHtml),
        cc: message.cc,
        bcc: message.bcc,
        record:
          message.record ??
          (personId > 0 ? `personne:${personId}` : null),
      };
    });
  }

  private enrichTrialConfirmation(subject: string, html: string): string {
    const prefix = `Confirmation de séance d'essai - `;
    if (!String(subject ?? '').startsWith(prefix)) return html;

    const sessionName = String(subject).slice(prefix.length).trim();
    const riders = this.menuStore.vm().riders ?? [];
    const candidates = riders.flatMap((rider) => rider.MesSeances ?? []);
    const session = candidates.find((item) => {
      const seance: any = item.seance ?? {};
      const label = String(seance.nom || seance.cours_nom || '').trim();
      if (label !== sessionName) return false;

      const dateLabel = this.formatDate(seance.date_seance);
      return !dateLabel || html.includes(dateLabel);
    })?.seance as any;

    if (!session) return html;

    const project = this.appStore.selectedProject();
    const projectName = String(project?.nom ?? '').trim();
    const projectId = Number(project?.id ?? 0);
    const lieu = projectId
      ? this.refDataStore
          .getLieuxState(projectId)
          .Liste.find((item) => Number(item.id) === Number(session.lieu_id))
      : null;

    const address = this.formatAddress(lieu?.adresse);
    const encadrants = (session.seanceProfesseurs ?? [])
      .map((prof: any) =>
        String(
          prof.surnom || `${prof.prenom ?? ''} ${prof.nom ?? ''}`,
        ).trim(),
      )
      .filter(Boolean)
      .join(', ');

    const personMatch = html.match(/pour\s*<strong>(.*?)<\/strong>/i);
    const personName = this.stripTags(personMatch?.[1] ?? '');
    const dateLabel = this.formatDate(session.date_seance);
    const lieuName = String(session.lieu_nom ?? lieu?.nom ?? '').trim();

    return [
      '<p>Bonjour,</p>',
      `<p>La demande de séance d'essai pour <strong>${this.escapeHtml(personName)}</strong> est bien enregistrée.</p>`,
      '<p>',
      `<strong>${this.escapeHtml(sessionName)}</strong><br>`,
      `${this.escapeHtml(dateLabel)} à ${this.escapeHtml(String(session.heure_debut ?? ''))}<br>`,
      `${this.escapeHtml(lieuName)}`,
      address ? `<br>${this.escapeHtml(address)}` : '',
      encadrants ? `<br><strong>Encadrants :</strong> ${this.escapeHtml(encadrants)}` : '',
      '</p>',
      '<p>Le club dispose désormais de cette information dans la feuille de présence.</p>',
      '<p>Nous avons hâte de vous accueillir.</p>',
      projectName ? `<p><strong>${this.escapeHtml(projectName)}</strong></p>` : '',
    ].join('');
  }

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR');
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address.trim();
    if (address.raw) return String(address.raw).trim();

    return [
      address.adresse1,
      address.adresse2,
      address.adresse3,
      address.Street,
      address.code_postal,
      address.PostCode,
      address.ville,
      address.City,
      address.Country,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }

  private stripTags(value: string): string {
    return String(value ?? '').replace(/<[^>]*>/g, '').trim();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private isHtmlDocument(value: string): boolean {
    const source = String(value ?? '').trim();
    return /^<!doctype\s+html\b/i.test(source) || /^<html\b/i.test(source);
  }
}
