import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export type BugReportSeverity = 'FAIBLE' | 'NORMALE' | 'BLOQUANTE';

export interface BugReportPayload {
  title: string;
  description: string;
  screen?: string;
  severity?: BugReportSeverity;
  steps?: string;
  expected?: string;
  actual?: string;
  route?: string;
  browser?: string;
  accountEmail?: string;
  version?: string;
}

@Injectable({ providedIn: 'root' })
export class BugReportApiService {
  constructor(private readonly api: ApiClientService) {}

  send(payload: BugReportPayload): Promise<{ ok: boolean }> {
    return this.api.POST<{ ok: boolean }>('/messages/bug-report', payload);
  }
}
