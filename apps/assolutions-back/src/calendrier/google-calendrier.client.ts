import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type GoogleObject = Record<string, any>;

/**
 * Utilise OAuth 2.0 de l'UTILISATEUR PROPRIETAIRE (assolutions.club@gmail.com).
 * Aucun service account, token ou secret dans Git/DB. Aucun appel tant que
 * GOOGLE_CALENDAR_ENABLED n'est pas explicitement 'true'.
 */
@Injectable()
export class GoogleCalendrierClient {
  private cachedToken: { value: string; expires: number } | null = null;
  readonly owner = 'assolutions.club@gmail.com';

  get enabled() { return process.env.GOOGLE_CALENDAR_ENABLED === 'true'; }

  private prefix(nom: string) {
    const env = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local').toLowerCase();
    if (env === 'preprod' || env === 'preproduction') return '[PREPROD] - ' + nom;
    if (env === 'prod' || env === 'production') return nom;
    return '[LOCAL - TEST] - ' + nom;
  }
  calendarName(nom: string) { return this.prefix(nom); }

  /** Environnement strictement autorise => ne JAMAIS inviter les vrais adherents hors prod. */
  isProduction() {
    const env = (process.env.APP_ENV ?? '').toLowerCase();
    if (env) return env === 'prod' || env === 'production';
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  }

  recipient(email: string, accountId?: number): string {
    const candidate = String(email || '').trim().toLowerCase();
    if (candidate === this.owner) return this.owner;
    if (this.isProduction()) return candidate;
    const local = candidate.split('@')[0].replace(/[^a-z0-9._-]/g, '-').slice(0, 45) || 'sans-mail';
    return `${local}${accountId ? '-' + accountId : '-projet'}@yopmail.com`;
  }

  private async accessToken(): Promise<string> {
    if (!this.enabled) throw new ServiceUnavailableException('GOOGLE_CALENDAR_DISABLED');
    if (this.cachedToken && this.cachedToken.expires > Date.now() + 90_000) {
      return this.cachedToken.value;
    }
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new ServiceUnavailableException('GOOGLE_CALENDAR_OAUTH_NOT_CONFIGURED');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: refreshToken, grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) {
      // La reponse Google peut contenir des informations sensibles : ne publier
      // que le code d'erreur OAuth (liste blanche), jamais error_description/token.
      let code = '';
      try {
        const result = (await response.json()) as { error?: unknown };
        code = typeof result.error === 'string' ? result.error : '';
      } catch { /* Un corps non JSON ne doit pas masquer l'erreur. */ }
      if (code === 'invalid_grant') {
        throw new ServiceUnavailableException('GOOGLE_OAUTH_REFRESH_INVALID_GRANT');
      }
      if (code === 'invalid_client') {
        throw new ServiceUnavailableException('GOOGLE_OAUTH_REFRESH_INVALID_CLIENT');
      }
      if (code === 'unauthorized_client') {
        throw new ServiceUnavailableException('GOOGLE_OAUTH_REFRESH_UNAUTHORIZED_CLIENT');
      }
      throw new ServiceUnavailableException('GOOGLE_OAUTH_REFRESH_FAILED_HTTP_' + response.status);
    }
    const result = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!result.access_token) throw new ServiceUnavailableException('GOOGLE_OAUTH_TOKEN_EMPTY');
    this.cachedToken = {
      value: result.access_token,
      expires: Date.now() + Math.max(60, Number(result.expires_in ?? 3600)) * 1000,
    };
    return result.access_token;
  }

  private async call(method: string, path: string, body?: GoogleObject, sendUpdates?: 'all' | 'none') {
    const q = sendUpdates ? '?sendUpdates=' + sendUpdates : '';
    const response = await fetch('https://www.googleapis.com/calendar/v3' + path + q, {
      method,
      headers: {
        Authorization: 'Bearer ' + await this.accessToken(),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 404 && (method === 'GET' || method === 'DELETE')) return null;
    if (!response.ok) {
      // N'exposer que des codes de diagnostic controles, jamais la reponse brute de Google.
      if (response.status === 403) {
        let error: any = null;
        try { error = await response.json(); } catch { /* Corps absent ou invalide. */ }
        const reasons = [
          ...(Array.isArray(error?.error?.errors) ? error.error.errors.map((item: any) => item?.reason) : []),
          ...(Array.isArray(error?.error?.details) ? error.error.details.map((item: any) => item?.reason) : []),
        ].map((value) => String(value || '').toLowerCase());
        if (reasons.some((reason) => ['accessnotconfigured', 'service_disabled', 'access_not_configured'].includes(reason))) {
          throw new ServiceUnavailableException('GOOGLE_CALENDAR_API_DISABLED_IN_CLOUD_PROJECT');
        }
        if (reasons.some((reason) => ['insufficientpermissions', 'access_token_scope_insufficient'].includes(reason))) {
          throw new ServiceUnavailableException('GOOGLE_CALENDAR_OAUTH_SCOPE_INSUFFICIENT');
        }
        if (reasons.some((reason) => ['ratelimitexceeded', 'userratelimitexceeded', 'quotaexceeded'].includes(reason))) {
          throw new ServiceUnavailableException('GOOGLE_CALENDAR_RATE_LIMITED');
        }
        throw new ServiceUnavailableException('GOOGLE_CALENDAR_API_FORBIDDEN_403');
      }
      throw new ServiceUnavailableException('GOOGLE_CALENDAR_API_HTTP_' + response.status);
    }
    if (response.status === 204) return {};
    return (await response.json()) as GoogleObject;
  }

  /** Verifie le vrai compte Google OAuth, jamais l'ID d'un calendrier. */
  async verifyOwner() {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + await this.accessToken(), Accept: 'application/json' },
    });
    if (!response.ok) throw new ServiceUnavailableException('GOOGLE_OIDC_USERINFO_FAILED');
    const user = (await response.json()) as {
      sub?: string; email?: string; email_verified?: boolean;
    };
    if (!user.sub || user.email_verified !== true ||
        String(user.email || '').trim().toLowerCase() !== this.owner) {
      throw new ServiceUnavailableException('GOOGLE_CALENDAR_OWNER_MISMATCH');
    }
    // Un succes UserInfo seul ne prouve pas que Calendar API et ses scopes fonctionnent.
    const primary = await this.call('GET', '/users/me/calendarList/primary');
    if (!primary || primary.accessRole !== 'owner') {
      throw new ServiceUnavailableException('GOOGLE_CALENDAR_PRIMARY_ACCESS_MISSING');
    }
  }

  /** Diagnostic en lecture seule : aucun agenda ou evenement cree. */
  async checkConnection() {
    const credentials_present = [
      'GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET',
      'GOOGLE_CALENDAR_REFRESH_TOKEN',
    ].every((key) => Boolean(process.env[key]));
    if (!this.enabled) {
      return { actif: false, credentials_present, proprietaire_verifie: false,
        code: 'GOOGLE_CALENDAR_DISABLED' };
    }
    await this.verifyOwner();
    return { actif: true, credentials_present: true, proprietaire_verifie: true,
      compte: this.owner, code: 'GOOGLE_CALENDAR_OAUTH_OK' };
  }

  async createCalendar(nom: string, description: string | null, timezone: string) {
    const created = await this.call('POST', '/calendars', {
      summary: this.calendarName(nom), description: description || undefined, timeZone: timezone,
    });
    if (!created?.id) throw new Error('GOOGLE_CALENDAR_ID_MISSING');
    return { id: String(created.id), url: 'https://calendar.google.com/calendar/u/0/r?cid=' +
      encodeURIComponent(String(created.id)) };
  }

  async updateCalendar(googleId: string, nom: string, description: string | null, timezone: string) {
    return this.call('PATCH', '/calendars/' + encodeURIComponent(googleId), {
      summary: this.calendarName(nom), description: description || '', timeZone: timezone,
    });
  }

  async getEvent(calendarId: string, eventId: string) {
    return this.call('GET', '/calendars/' + encodeURIComponent(calendarId) +
      '/events/' + encodeURIComponent(eventId));
  }

  async upsertEvent(calendarId: string, eventId: string, body: GoogleObject, notify: boolean) {
    const path = '/calendars/' + encodeURIComponent(calendarId) + '/events';
    const existing = await this.getEvent(calendarId, eventId);
    if (existing) {
      // Preserver les RSVP Google sur les adresses toujours presentes.
      const old = new Map<string, string>((existing.attendees ?? []).map((x: any) =>
        [String(x.email).toLowerCase(), x.responseStatus]));
      const attendees = (body.attendees ?? []).map((x: any) => ({
        ...x, ...(old.has(String(x.email).toLowerCase())
          ? { responseStatus: old.get(String(x.email).toLowerCase()) } : {}),
      }));
      return this.call('PUT', path + '/' + encodeURIComponent(eventId),
        { ...body, attendees, id: eventId }, notify ? 'all' : 'none');
    }
    try {
      return await this.call('POST', path, { ...body, id: eventId }, notify ? 'all' : 'none');
    } catch (e: any) {
      if (e?.message === 'GOOGLE_CALENDAR_API_HTTP_409') {
        return this.call('PUT', path + '/' + encodeURIComponent(eventId),
          { ...body, id: eventId }, notify ? 'all' : 'none');
      }
      throw e;
    }
  }

  async deleteEvent(calendarId: string, eventId: string, notify: boolean) {
    return this.call('DELETE', '/calendars/' + encodeURIComponent(calendarId) +
      '/events/' + encodeURIComponent(eventId), undefined, notify ? 'all' : 'none');
  }
}
