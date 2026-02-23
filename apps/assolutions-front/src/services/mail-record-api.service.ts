import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { MailRecord, CreateMailRecordDto, UpdateMailRecordDto } from '@shared/lib/mail-record.interface';

@Injectable({ providedIn: 'root' })
export class MailRecordApiService {
  private readonly base = '/mail-record';

  constructor(private api: ApiClientService) {}

  list(): Promise<MailRecord[]> {
    return this.api.GET<MailRecord[]>(this.base);
  }

  get(id: number): Promise<MailRecord> {
    return this.api.GET<MailRecord>(`${this.base}/${id}`);
  }

  create(dto: CreateMailRecordDto): Promise<MailRecord> {
    return this.api.POST<MailRecord>(this.base, dto);
  }

  update(id: number, dto: UpdateMailRecordDto): Promise<MailRecord> {
    return this.api.POST<MailRecord>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
