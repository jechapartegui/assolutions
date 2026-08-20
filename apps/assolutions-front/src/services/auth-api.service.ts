import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment';
import { MeResponse } from '@shared/lib/compte.interface';

export type AppMode = 'ADMIN' | 'APPLI';

export interface PreloginResponse {
  password_required: boolean;
  mode: AppMode;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private global: GlobalService) {}

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async prelogin(login: string): Promise<PreloginResponse> {
    return await this.global.POST(this.url('/auth/prelogin'), { login });
  }

  async login(login: string, password?: string): Promise<MeResponse> {
    const res = await this.global.POST(this.url('/auth/login'), { login, password });

    if (res?.token) {
      sessionStorage.setItem('auth_token', res.token);
      localStorage.removeItem('auth_token');
    }

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
