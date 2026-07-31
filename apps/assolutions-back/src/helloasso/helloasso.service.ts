import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

type HelloAssoTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type HelloAssoCheckoutPayer = {
  firstName: string;
  lastName: string;
  email: string;
};

export type HelloAssoCheckoutRequest = {
  totalAmount: number;
  initialAmount: number;
  itemName: string;
  payer: HelloAssoCheckoutPayer;
  returnPath: string;
  backPath: string;
  errorPath: string;
};

export type HelloAssoCheckoutResponse = {
  id: number;
  redirectUrl: string;
};

@Injectable()
export class HelloAssoService {
  private readonly logger = new Logger(HelloAssoService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  async createTestCheckout() {
    const checkout = await this.createCheckout({
      totalAmount: 100,
      initialAmount: 100,
      itemName: 'POC Assolutions - adhesion',
      payer: {
        firstName: 'Jean-Emmanuel',
        lastName: 'Chapartegui',
        email: 'jechapartegui@gmail.com',
      },
      backPath: '/helloasso-test',
      errorPath: '/helloasso-test-erreur',
      returnPath: '/helloasso-test-ok',
    });

    return {
      ok: true,
      checkoutIntentId: checkout.id,
      redirectUrl: checkout.redirectUrl,
    };
  }

  async createCheckout(
    request: HelloAssoCheckoutRequest,
  ): Promise<HelloAssoCheckoutResponse> {
    const token = await this.getAccessToken();
    const frontUrl = this.getFrontUrl();

    const payload = {
      totalAmount: Math.round(request.totalAmount),
      initialAmount: Math.round(request.initialAmount),
      itemName: request.itemName,
      backUrl: this.buildFrontUrl(frontUrl, request.backPath),
      errorUrl: this.buildFrontUrl(frontUrl, request.errorPath),
      returnUrl: this.buildFrontUrl(frontUrl, request.returnPath),
      containsDonation: false,
      payer: request.payer,
    };

    this.logger.log(
      `[HELLOASSO] Création checkout total=${payload.totalAmount} initial=${payload.initialAmount}`,
    );

    const response = await this.request(
      'POST',
      this.checkoutCollectionUrl(),
      token,
      payload,
    );

    const id = Number((response as any)?.id);
    const redirectUrl = String((response as any)?.redirectUrl ?? '');
    if (!id || !redirectUrl) {
      throw new InternalServerErrorException(
        `Réponse HelloAsso invalide : ${JSON.stringify(response)}`,
      );
    }

    return { id, redirectUrl };
  }

  async getCheckoutIntent(id: number): Promise<unknown> {
    const token = await this.getAccessToken();
    return this.request(
      'GET',
      `${this.checkoutCollectionUrl()}/${Number(id)}`,
      token,
    );
  }

  isPaid(payload: unknown): boolean {
    const states = this.collectStateValues(payload);
    return states.some((state) =>
      [
        'AUTHORIZED',
        'AUTHORISED',
        'PAID',
        'PROCESSED',
        'SUCCESS',
        'SUCCEEDED',
      ].includes(state),
    );
  }

  extractPaymentState(payload: unknown): string {
    const states = this.collectStateValues(payload);
    const preferred = states.find((state) =>
      [
        'AUTHORIZED',
        'AUTHORISED',
        'PAID',
        'PROCESSED',
        'SUCCESS',
        'SUCCEEDED',
        'PENDING',
        'REFUSED',
        'CANCELED',
        'CANCELLED',
      ].includes(state),
    );
    return preferred ?? states[0] ?? 'UNKNOWN';
  }

  extractCheckoutIntentId(payload: unknown): number | null {
    const found = this.findNumericValue(
      payload,
      new Set(['checkoutintentid', 'checkout_intent_id', 'checkoutid']),
    );
    return found && found > 0 ? found : null;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30_000) {
      return this.cachedToken.value;
    }

    const clientId = process.env.HELLOASSO_CLIENT_ID;
    const clientSecret = process.env.HELLOASSO_CLIENT_SECRET;
    const oauthUrl =
      process.env.HELLOASSO_OAUTH_URL ??
      'https://api.helloasso.com/oauth2/token';

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Configuration HelloAsso manquante : HELLOASSO_CLIENT_ID / HELLOASSO_CLIENT_SECRET',
      );
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);

    const response = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const responseText = await response.text();
    if (!response.ok) {
      this.logger.error(responseText);
      throw new InternalServerErrorException(
        `Erreur token HelloAsso ${response.status} : ${responseText}`,
      );
    }

    const data = JSON.parse(responseText) as HelloAssoTokenResponse;
    if (!data.access_token) {
      throw new InternalServerErrorException(
        'Réponse HelloAsso invalide : access_token absent',
      );
    }

    this.cachedToken = {
      value: data.access_token,
      expiresAt: now + Math.max(60, Number(data.expires_in ?? 300)) * 1000,
    };
    return data.access_token;
  }

  private async request(
    method: 'GET' | 'POST',
    url: string,
    token: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
    });

    const text = await response.text();
    if (!response.ok) {
      this.logger.error(`[HELLOASSO] ${method} ${url} -> ${response.status}`);
      this.logger.error(text);
      throw new InternalServerErrorException(
        `Erreur HelloAsso ${response.status} : ${text}`,
      );
    }

    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new InternalServerErrorException('Réponse HelloAsso non JSON');
    }
  }

  private checkoutCollectionUrl(): string {
    const apiUrl =
      process.env.HELLOASSO_API_URL ?? 'https://api.helloasso.com/v5';
    const organizationSlug = process.env.HELLOASSO_ORGANIZATION_SLUG;
    if (!organizationSlug) {
      throw new InternalServerErrorException(
        'Configuration HelloAsso manquante : HELLOASSO_ORGANIZATION_SLUG',
      );
    }
    return `${apiUrl.replace(/\/+$/, '')}/organizations/${organizationSlug}/checkout-intents`;
  }

  private getFrontUrl(): string {
    const raw = process.env.FRONT_URL;
    if (!raw) {
      throw new InternalServerErrorException('Configuration manquante : FRONT_URL');
    }
    const normalized = raw.trim().replace(/\/+$/, '');
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InternalServerErrorException(`FRONT_URL invalide : ${raw}`);
    }
    return normalized;
  }

  private buildFrontUrl(frontUrl: string, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${frontUrl}${normalizedPath}`;
  }

  private collectStateValues(payload: unknown): string[] {
    const values: string[] = [];
    const walk = (value: unknown, key = ''): void => {
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, key));
        return;
      }
      if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(
          ([childKey, child]) => walk(child, childKey),
        );
        return;
      }
      if (
        typeof value === 'string' &&
        ['state', 'status', 'paymentstate', 'payment_state'].includes(
          key.replace(/[^a-z_]/gi, '').toLowerCase(),
        )
      ) {
        values.push(value.trim().toUpperCase());
      }
    };
    walk(payload);
    return Array.from(new Set(values));
  }

  private findNumericValue(payload: unknown, keys: Set<string>): number | null {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        const found = this.findNumericValue(item, keys);
        if (found) return found;
      }
      return null;
    }
    if (!payload || typeof payload !== 'object') return null;

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      const normalizedKey = key.replace(/[^a-z_]/gi, '').toLowerCase();
      if (keys.has(normalizedKey)) {
        const numberValue = Number(value);
        if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
      }
      const nested = this.findNumericValue(value, keys);
      if (nested) return nested;
    }
    return null;
  }
}
