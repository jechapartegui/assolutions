import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { MailProject, CreateMailProjectDto, UpdateMailProjectDto } from '@shared/lib/mail-project.interface';

@Injectable({ providedIn: 'root' })
export class MailProjectApiService {
  private readonly base = '/mail-project';

  constructor(private api: ApiClientService) {}

  get(): Promise<MailProject> {
    return this.api.GET<MailProject>(this.base);
  }

  createOrReplace(dto: CreateMailProjectDto): Promise<MailProject> {
    return this.api.POST<MailProject>(this.base, dto);
  }

  update(dto: UpdateMailProjectDto): Promise<MailProject> {
    return this.api.POST<MailProject>(`${this.base}/update`, dto);
  }

  remove(): Promise<void> {
    return this.api.POST<void>(`${this.base}/delete`, {});
  }
}
