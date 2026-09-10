import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export type OnboardingStatus = {
  project: { id: number; nom: string; activite: string | null } | null;
  counts: {
    saison: number;
    lieu: number;
    groupe: number;
    professeur: number;
    contrat: number;
    banque: number;
  };
  steps: {
    project: boolean;
    saison: boolean;
    lieu: boolean;
    groupe: boolean;
    professeur: boolean;
    contrat: boolean;
    mails: boolean;
    banque: boolean;
  };
  required_done: number;
  required_total: number;
  complete: boolean;
};

export type BootstrapClubRequest = {
  club_name: string;
  activity: string;
  email: string;
  password?: string | null;
};

export type BootstrapClubResponse = {
  ok: true;
  email: string;
  project_id: number;
  project_name: string;
};

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly base = '/onboarding';

  constructor(private readonly api: ApiClientService) {}

  bootstrap(dto: BootstrapClubRequest): Promise<BootstrapClubResponse> {
    return this.api.POST<BootstrapClubResponse>(`${this.base}/bootstrap`, dto);
  }

  status(): Promise<OnboardingStatus> {
    return this.api.GET<OnboardingStatus>(`${this.base}/status`);
  }

  createDefaultBank(): Promise<{ id: number; nom: string; type: string }> {
    return this.api.POST<{ id: number; nom: string; type: string }>(
      `${this.base}/default-bank`,
      {},
    );
  }
}
