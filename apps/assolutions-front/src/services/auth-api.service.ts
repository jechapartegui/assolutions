import { Injectable } from '@angular/core';
import { MeResponse } from '@shared/lib/compte.interface';
import { environment } from '../environments/environment';
import { clearAuthToken, setAuthToken } from './auth-token.storage';
import { GlobalService } from './global.services';

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
    if (res?.token) setAuthToken(res.token);
    return res;
  }

  async me(): Promise<MeResponse> {
    return await this.global.GET(this.url('/auth/me'));
  }

  async changeMyPassword(newPassword: string | null): Promise<boolean> {
    return await this.global.POST(this.url('/auth/change-my-password'), { newPassword });
  }

  logout(): void {
    clearAuthToken();
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
    newPassword: string,
  ): Promise<boolean> {
    return await this.global.POST(this.url('/auth/set-password-with-token'), {
      login,
      token,
      newPassword,
    });
  }
}
