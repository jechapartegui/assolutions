import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { environment } from '../environments/environment';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly timeoutMilliseconds = 1500000;

  constructor(
    private http: HttpClient,
    private store: AppStore, // <= adapte au nom exact dans ton projet
  ) {}

  // ---------- Public API ----------
  GET<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  POST<T>(path: string, body: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  PUT<T>(path: string, body: any): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  PATCH<T>(path: string, body: any): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * Delete "compat serveur": POST /resource/:id/delete
   * (ou tout endpoint delete que tu choisis)
   */
  POST_DELETE<T>(path: string, body: any = {}): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  // ---------- Internals ----------
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    path: string,
    body?: any
  ): Promise<T> {
    try {
      const url = this.makeUrl(path);
      const headers = this.buildHeaders();

      const obs =
        method === 'GET'
          ? this.http.get<T>(url, { headers })
          : method === 'POST'
          ? this.http.post<T>(url, body ?? {}, { headers })
          : method === 'PUT'
          ? this.http.put<T>(url, body ?? {}, { headers })
          : this.http.patch<T>(url, body ?? {}, { headers });

      return await firstValueFrom(
        obs.pipe(
          timeout(this.timeoutMilliseconds),
          catchError((error) => {
            if (error?.name === 'TimeoutError') throw new Error('TIMEOUT_ERROR');
            throw error;
          })
        )
      );
   } catch (error) {
  console.log(error);
  throw error; // ✅
}
  }

  private makeUrl(path: string): string {
    // accepte '/cours' ou 'cours'
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }

  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders()
      .set('content-type', 'application/json')
      .set('lang', this.getCurrentLanguage());

    // projectid optionnel
    console.log("selectedProjectId"  + this.store.selectedProjectId?.());
    const projectId = this.store.selectedProjectId?.() ?? null;
    if (projectId) headers = headers.set('projectid', projectId.toString());

    // JWT
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    return headers;
  }

  private getCurrentLanguage(): string {
    // adapte à ta logique i18n existante
    return this.store.language?.() ?? 'fr';
  }
}
