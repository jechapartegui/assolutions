import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { PersonneApiService } from './personne-api.service';
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
        html: this.isHtmlDocument(legacyBody)
          ? legacyBody
          : message.html || legacyBody,
        cc: message.cc,
        bcc: message.bcc,
        record:
          message.record ??
          (personId > 0 ? `personne:${personId}` : null),
      };
    });
  }

  private isHtmlDocument(value: string): boolean {
    const source = String(value ?? '').trim();
    return /^<!doctype\s+html\b/i.test(source) || /^<html\b/i.test(source);
  }
}
