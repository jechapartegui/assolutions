import { Injectable } from '@angular/core';
import { Compte } from '@shared/lib/compte.interface';
import { ApiClientService } from './api-client.service';

export interface RegisterCompteWithProjectDto {
  email: string;
  password?: string | null;
  mdp_requis?: boolean;
  project_id: number;
}

export interface CreateCompteWithProjectDto {
  email: string;
  password?: string | null;
  actif?: boolean;
  mail_actif?: boolean;
  echec_connexion?: boolean;
  project_id: number;
}

@Injectable({ providedIn: 'root' })
export class CompteApiService {
  private readonly base = '/comptes';

  constructor(private readonly api: ApiClientService) {}

  list(): Promise<Compte[]> {
    return this.api.GET<Compte[]>(this.base);
  }

  listByProject(projectId: number): Promise<Compte[]> {
    return this.api.GET<Compte[]>(`${this.base}/by-project/${projectId}`);
  }

  createWithProject(dto: CreateCompteWithProjectDto): Promise<Compte> {
    return this.api.POST<Compte>(`${this.base}/with-project`, dto);
  }

  registerWithProject(dto: RegisterCompteWithProjectDto): Promise<Compte> {
    return this.api.POST<Compte>(`${this.base}/register-with-project`, dto);
  }

  resendActivation(email: string): Promise<{ ok: true }> {
    return this.api.POST<{ ok: true }>(`${this.base}/resend-activation`, { email });
  }

  check_token(login: string, token: string): Promise<Compte> {
    return this.api.POST<Compte>(`${this.base}/check-token`, { login, token });
  }
}
