import { Injectable } from '@angular/core';
import { GlobalService } from './global.services'; // adapte le chemin si besoin
import { environment } from '../environments/environment'; // ou ton fichier d'env
import { MeResponse } from '@shared/lib/compte.interface';

export type AppMode = 'ADMIN' | 'APPLI';

export interface PreloginResponse {
  password_required: boolean;
  mode: AppMode;
}



@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = environment.apiUrl; // ex: 'https://assolutions.usivryroller.fr/api'

  constructor(private global: GlobalService) {}

  // --- helpers
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /**
   * POST /auth/prelogin
   * body: { login }
   */
  async prelogin(login: string): Promise<PreloginResponse> {
    return await this.global.POST(this.url('/auth/prelogin'), { login });
  }


  /**
   * POST /auth/login
   * body: { login, password? }
   * Stocke le token dans localStorage (clé déjà utilisée par GlobalService)
   */
  async login(login: string, password?: string): Promise<MeResponse> {
    const res = await this.global.POST(this.url('/auth/login'), { login, password });

    if (res?.token) {
      localStorage.setItem('auth_token', res.token);
    }

    return res;
  }

  /**
   * GET /auth/me
   * Retourne le compte courant (token déjà injecté par GlobalService s'il existe)
   */
  async me(): Promise<MeResponse> {
    return await this.global.GET(this.url('/auth/me'));
  }

  /**
   * PUT /auth/my-password
   * body: { newPassword: string | null }
   */
  async changeMyPassword(newPassword: string | null): Promise<boolean> {
    return await this.global.PUT(this.url('/auth/my-password'), { newPassword });
  }

  /**
   * Déconnexion: supprime le JWT
   */
  logout(): void {
    localStorage.removeItem('auth_token');
  }

  async reinit_mdp(login: string): Promise<boolean> {
  return await this.global.POST(this.url('/auth/reinit_mdp'), { login });
}

async checkResetToken(login: string, token: string): Promise<boolean> {
  return await this.global.POST(this.url('/auth/check-reset-token'), { login, token });
}

async setPasswordWithToken(
  login: string,
  token: string,
  newPassword: string
): Promise<boolean> {
  return await this.global.POST(this.url('/auth/set-password-with-token'), {
    login,
    token,
    newPassword,
  });
}
}
