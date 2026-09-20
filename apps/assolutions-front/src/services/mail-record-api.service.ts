import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export type MailRecordStatus = 'SENT' | 'FAILED';

export interface MailRecordView {
  id: number;
  record: string;
  to: string;
  subject: string;
  project_id?: number | null;
  created_at?: string | null;
  status?: MailRecordStatus | null;
  error?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MailRecordApiService {
  private readonly base = '/mail-record';

  constructor(private readonly api: ApiClientService) {}

  list(): Promise<MailRecordView[]> {
    return this.api.GET<MailRecordView[]>(this.base);
  }
}
