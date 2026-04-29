import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  OutgoingMessageVm,
  SendMessagesDto,
  SendMessagesResultVm,
} from '@shared/lib/mail-input.interface';

@Injectable({ providedIn: 'root' })
export class MessageApiService {
  private readonly base = '/messages';

  constructor(private api: ApiClientService) {}

  send(message: OutgoingMessageVm): Promise<SendMessagesResultVm> {
    return this.sendMany([message]);
  }

  sendMany(messages: OutgoingMessageVm[]): Promise<SendMessagesResultVm> {
    const dto: SendMessagesDto = { messages };
    return this.api.POST<SendMessagesResultVm>(`${this.base}/send`, dto);
  }
}