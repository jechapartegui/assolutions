import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { AppStore } from '../app/app.store';

export interface ApiErrorPayload {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  url?: string | null;
}

export class ApiError extends Error implements ApiErrorPayload {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly url?: string | null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly timeoutMilliseconds = 25_000;

  constructor(
    private readonly http: HttpClient,
    private readonly store: AppStore
  ) {}

  GET<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  POST<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  PUT<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  PATCH<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  POST_DELETE<T>(path: string, body: unknown = {}): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = this.makeUrl(path);
    const headers = this.buildHeaders();
    const request$ =
      method === 'GET'
        ? this.http.get<T>(url, { headers })
        : method === 'POST'
          ? this.http.post<T>(url, body ?? {}, { headers })
          : method === 'PUT'
            ? this.http.put<T>(url, body ?? {}, { headers })
            : this.http.patch<T>(url, body ?? {}, { headers });

    return firstValueFrom(
      request$.pipe(
        timeout(this.timeoutMilliseconds),
        catchError((error: unknown) => throwError(() => this.normalizeError(error, url)))
      )
    );
  }

  private normalizeError(error: unknown, url: string): ApiError {
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return new ApiError(
        408,
        'TIMEOUT_ERROR',
        'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.',
        undefined,
        url
      );
    }

    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      const rawMessage = Array.isArray(payload?.message)
        ? payload.message.join(' ')
        : payload?.message ?? error.message;
      const code = payload?.code ?? this.defaultCode(error.status);
      const message =
        typeof rawMessage === 'string' && rawMessage.trim()
          ? rawMessage.trim()
          : this.defaultMessage(error.status);

      return new ApiError(
        error.status,
        code,
        message,
        payload?.details ?? payload,
        error.url
      );
    }

    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      return new ApiError(0, 'CLIENT_ERROR', error.message, error, url);
    }

    return new ApiError(0, 'UNKNOWN_ERROR', 'Une erreur inconnue est survenue.', error, url);
  }

  private defaultCode(status: number): string {
    if (status === 0) return 'NETWORK_ERROR';
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status >= 500) return 'SERVER_ERROR';
    return 'HTTP_ERROR';
  }

  private defaultMessage(status: number): string {
    if (status === 0) return 'Impossible de joindre le serveur.';
    if (status === 401) return 'Vous devez vous reconnecter.';
    if (status === 403) return "Vous n'êtes pas autorisé à effectuer cette action.";
    if (status === 404) return 'La ressource demandée est introuvable.';
    if (status === 409) return 'Cette opération entre en conflit avec une donnée existante.';
    if (status >= 500) return 'Le serveur a rencontré une erreur.';
    return 'La requête a échoué.';
  }

  private makeUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders()
      .set('content-type', 'application/json')
      .set('lang', this.getCurrentLanguage());

    const projectId = this.store.selectedProjectId?.() ?? null;
    if (projectId) headers = headers.set('projectid', projectId.toString());

    const token = sessionStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    return headers;
  }

  private getCurrentLanguage(): string {
    return this.store.language?.() ?? 'fr';
  }
}
