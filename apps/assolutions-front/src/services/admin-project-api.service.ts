import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export interface AdminProjectInfo {
  id: number;
  nom: string;
  actif: boolean;
  public: boolean;
  date_debut: string | null;
  date_fin: string | null;
  contact: any;
  adresse: any;
  activite: string | null;
  lang: string | null;
  logo: string | null;
  couleur: string | null;
  login: string | null;
}

export interface AdminProjectOverview {
  project: AdminProjectInfo;
  accountCount: number;
  personCount: number;
}

export interface AdminProjectAccountPerson {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  archive: boolean;
}

export interface AdminProjectAccount {
  id: number;
  login: string;
  actif: boolean;
  mail_actif: boolean;
  mail_ko: boolean;
  echec_connexion: boolean;
  derniere_connexion: string | null;
  project_count: number;
  projects: Array<{ id: number; nom: string }>;
  people: AdminProjectAccountPerson[];
}

export interface AdminProjectPersonSeason {
  id: number;
  nom: string;
  active: boolean;
  date_inscription: string | null;
}

export interface AdminProjectPerson {
  id: number;
  compte: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  date_naissance: string | null;
  gender: boolean;
  archive: boolean;
  date_creation: string | null;
  date_maj: string | null;
  login: string;
  compte_actif: boolean;
  mail_actif: boolean;
  project_count: number;
  saisons: AdminProjectPersonSeason[];
}

export interface AdminProjectElevation {
  token: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AdminProjectApiService {
  private readonly base = '/admin-project';

  constructor(private readonly api: ApiClientService) {}

  overview(): Promise<AdminProjectOverview> {
    return this.api.GET<AdminProjectOverview>(`${this.base}/overview`);
  }

  accounts(): Promise<AdminProjectAccount[]> {
    return this.api.GET<AdminProjectAccount[]>(`${this.base}/accounts`);
  }

  people(): Promise<AdminProjectPerson[]> {
    return this.api.GET<AdminProjectPerson[]>(`${this.base}/people`);
  }

  updateProject(dto: Partial<AdminProjectInfo>): Promise<AdminProjectInfo> {
    return this.api.POST<AdminProjectInfo>(`${this.base}/project/update`, dto);
  }

  elevate(code: string): Promise<AdminProjectElevation> {
    return this.api.POST<AdminProjectElevation>(`${this.base}/elevate`, { code });
  }

  updateAccount(
    id: number,
    dto: { login: string; actif: boolean; mail_actif: boolean; elevation_token?: string | null },
  ): Promise<AdminProjectAccount> {
    return this.api.POST<AdminProjectAccount>(`${this.base}/accounts/${id}/update`, dto);
  }

  resetPassword(id: number, elevationToken?: string | null): Promise<{ ok: true }> {
    return this.api.POST<{ ok: true }>(`${this.base}/accounts/${id}/reset-password`, {
      elevation_token: elevationToken ?? null,
    });
  }
}
