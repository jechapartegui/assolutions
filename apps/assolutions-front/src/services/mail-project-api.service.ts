import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  InitMailProjectDto,
  MailProject,
  MailProjectTemplateType,
  MailProjectTemplateVm,
  UpdateMailProjectBodylessTemplateDto,
  UpdateMailProjectTemplateDto,
} from '@shared/lib/mail-project.interface';

@Injectable({ providedIn: 'root' })
export class MailProjectApiService {
  private readonly base = '/mail-project';

  constructor(private api: ApiClientService) {}

  get(): Promise<MailProject> {
    return this.api.GET<MailProject>(this.base);
  }

  init(dto: InitMailProjectDto): Promise<MailProject> {
    return this.api.POST<MailProject>(`${this.base}/init`, dto);
  }

  getTemplate(type: MailProjectTemplateType): Promise<MailProjectTemplateVm> {
    return this.api.GET<MailProjectTemplateVm>(`${this.base}/${type}`);
  }

  updateTemplate(
    type: MailProjectTemplateType,
    dto: UpdateMailProjectTemplateDto | UpdateMailProjectBodylessTemplateDto,
  ): Promise<MailProjectTemplateVm> {
    return this.api.POST<MailProjectTemplateVm>(`${this.base}/${type}`, dto);
  }
}