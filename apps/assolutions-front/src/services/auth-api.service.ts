import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment';
import { MeResponse } from '@shared/lib/compte.interface';
import { CompteApiService } from './compte-api.service';

export type AppMode = 'ADMIN' | 'APPLI';

export interface PreloginResponse {
  password_required: boolean;
  mode: AppMode;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private global: GlobalService,
    private compteApi: CompteApiService
  ) {}

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private persistToken(res: MeResponse): void {
    if (res?.token) {
      sessionStorage.setItem('auth_token', res.token);
      localStorage.removeItem('auth_token');
    }
  }

  private isInactiveAccountError(error: unknown): boolean {
    return error instanceof Error && error.message === 'ACCOUNT_NOT_ACTIVE';
  }

  private async handleInactiveAccount(login: string): Promise<never> {
    const email = (login ?? '').trim().toLowerCase();
    const resend = window.confirm(
      $localize`Ce compte n’est pas encore activé. Voulez-vous recevoir un nouveau mail d’activation ? Pensez à vérifier vos spams ou courriers indésirables.`
    );

    if (!resend) {
      throw new Error('ACCOUNT_NOT_ACTIVE');
    }

    await this.compteApi.resendActivation(email);
    throw new Error('ACTIVATION_EMAIL_RESENT');
  }

  async prelogin(login: string): Promise<PreloginResponse> {
    try {
      return await this.global.POST(this.url('/auth/prelogin'), { login });
    } catch (error: unknown) {
      if (this.isInactiveAccountError(error)) {
        return await this.handleInactiveAccount(login);
      }
      throw error;
    }
  }

  async login(login: string, password?: string): Promise<MeResponse> {
    try {
      const res = await this.global.POST(this.url('/auth/login'), { login, password });
      this.persistToken(res);
      return res;
    } catch (error: unknown) {
      if (this.isInactiveAccountError(error)) {
        return await this.handleInactiveAccount(login);
      }
      throw error;
    }
  }

  async activate(login: string, token: string): Promise<MeResponse> {
    const res = await this.global.POST(this.url('/auth/activate'), { login, token });
    this.persistToken(res);
    return res;
  }

  async requestLoginLink(login: string): Promise<boolean> {
    return await this.global.POST(this.url('/auth/request-login-link'), { login });
  }

  async loginWithToken(login: string, token: string): Promise<MeResponse> {
    const res = await this.global.POST(this.url('/auth/login-with-token'), { login, token });
    this.persistToken(res);
    return res;
  }

  async me(): Promise<MeResponse> {
    return await this.global.GET(this.url('/auth/me'));
  }

  async changeMyPassword(newPassword: string | null): Promise<boolean> {
    return await this.global.POST(this.url('/auth/change-my-password'), { newPassword });
  }

  logout(): void {
    sessionStorage.removeItem('auth_token');
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
