import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { MailAccount, CreateMailAccountDto, UpdateMailAccountDto } from '@shared/lib/mail-account.interface';

@Injectable({ providedIn: 'root' })
export class MailAccountApiService {
  private readonly base = '/mail-account';

  constructor(private api: ApiClientService) {}

  list(): Promise<MailAccount[]> {
    return this.api.GET<MailAccount[]>(this.base);
  }

  get(id: number): Promise<MailAccount> {
    return this.api.GET<MailAccount>(`${this.base}/${id}`);
  }

  create(dto: CreateMailAccountDto): Promise<MailAccount> {
    return this.api.POST<MailAccount>(this.base, dto);
  }

  update(id: number, dto: UpdateMailAccountDto): Promise<MailAccount> {
    return this.api.POST<MailAccount>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
