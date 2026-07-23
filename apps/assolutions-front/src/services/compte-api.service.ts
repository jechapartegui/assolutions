// À intégrer dans compte-api.service.ts

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Compte } from '@shared/lib/compte.interface';

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

  constructor(private api: ApiClientService) {}

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

  check_token(login: string, token: string): Promise<Compte> {
    return this.api.POST<Compte>(`${this.base}/check-token`, { login, token });
  }
}
