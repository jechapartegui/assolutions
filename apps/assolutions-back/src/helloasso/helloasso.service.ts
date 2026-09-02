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
  installments: number;
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

  async createCheckout(
    request: HelloAssoCheckoutRequest,
  ): Promise<HelloAssoCheckoutResponse> {
    const token = await this.getAccessToken();
    const frontUrl = this.getFrontUrl();
    const installments = Math.max(1, Math.trunc(request.installments || 1));
    const totalAmount = Math.round(request.totalAmount);
    const initialAmount =
      installments <= 1
        ? totalAmount
        : Math.min(totalAmount, Math.round(request.initialAmount));

    const payload: Record<string, unknown> = {
      totalAmount,
      initialAmount,
      itemName: request.itemName,
      backUrl: this.buildFrontUrl(frontUrl, request.backPath),
      errorUrl: this.buildFrontUrl(frontUrl, request.errorPath),
      returnUrl: this.buildFrontUrl(frontUrl, request.returnPath),
      containsDonation: false,
      payer: request.payer,
    };

    // HelloAsso renvoie les metadata du checkout dans ses notifications.
    // Le sid du returnPath est notre identifiant stable de souscription : il
    // permet de rattacher un webhook même lorsque checkoutIntentId n'est pas
    // présent dans le type de notification reçu.
    const subscriptionId = this.subscriptionIdFromReturnPath(request.returnPath);
    if (subscriptionId) {
      payload.metadata = { souscription_id: subscriptionId };
    }

    if (installments > 1) {
      payload.terms = this.buildPaymentTerms(
        totalAmount - initialAmount,
        installments - 1,
      );
    }

    this.logger.log(
      `[HELLOASSO] environnement=${this.environment()} api=${this.apiBaseUrl()} total=${totalAmount} initial=${initialAmount} echeances=${installments}`,
    );
    this.logger.debug(
      `[HELLOASSO] callbacks back=${String(payload.backUrl)} return=${String(payload.returnUrl)} error=${String(payload.errorUrl)}`,
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
      this.logger.error('[HELLOASSO] réponse checkout invalide');
      throw new InternalServerErrorException('Réponse HelloAsso invalide');
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

  extractSubscriptionId(payload: unknown): number | null {
    const found = this.findNumericValue(
      payload,
      new Set([
        'souscriptionid',
        'souscription_id',
        'subscriptionid',
        'subscription_id',
      ]),
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
    const oauthUrl = this.oauthTokenUrl();

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
      this.logger.error(`[HELLOASSO] OAuth -> ${response.status}`);
      throw new InternalServerErrorException(
        `Erreur token HelloAsso (${response.status})`,
      );
    }

    let data: HelloAssoTokenResponse;
    try {
      data = JSON.parse(responseText) as HelloAssoTokenResponse;
    } catch {
      throw new InternalServerErrorException('Réponse OAuth HelloAsso non JSON');
    }

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
      const message = this.extractHelloAssoError(text, response.status);
      throw new InternalServerErrorException(message);
    }

    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new InternalServerErrorException('Réponse HelloAsso non JSON');
    }
  }

  private buildPaymentTerms(remainingAmount: number, count: number) {
    if (remainingAmount <= 0 || count <= 0) return [];
    const base = Math.floor(remainingAmount / count);
    let remainder = remainingAmount - base * count;
    const today = new Date();

    // HelloAsso refuse certaines échéances trop proches de la fin du mois.
    // Toutes les échéances différées tombent donc le 5. Jusqu'au 20 inclus,
    // la première est le mois suivant ; à partir du 21, on saute un mois.
    const firstDueMonthOffset = today.getUTCDate() > 20 ? 2 : 1;

    return Array.from({ length: count }, (_, index) => {
      const amount = base + (remainder-- > 0 ? 1 : 0);
      const date = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + firstDueMonthOffset + index,
        5,
      ));
      return {
        amount,
        date: date.toISOString().slice(0, 10),
      };
    });
  }

  private environment(): 'sandbox' | 'production' {
    const explicit = (process.env.HELLOASSO_ENV ?? '').trim().toLowerCase();
    if (explicit === 'production' || explicit === 'prod') return 'production';
    return 'sandbox';
  }

  private apiBaseUrl(): string {
    const configured = process.env.HELLOASSO_API_URL?.trim();
    if (configured) return configured.replace(/\/+$/, '');
    return this.environment() === 'production'
      ? 'https://api.helloasso.com/v5'
      : 'https://api.helloasso-sandbox.com/v5';
  }

  private oauthTokenUrl(): string {
    const configured = process.env.HELLOASSO_OAUTH_URL?.trim();
    if (configured) return configured.replace(/\/+$/, '');
    return this.environment() === 'production'
      ? 'https://api.helloasso.com/oauth2/token'
      : 'https://api.helloasso-sandbox.com/oauth2/token';
  }

  private checkoutCollectionUrl(): string {
    const organizationSlug = process.env.HELLOASSO_ORGANIZATION_SLUG;
    if (!organizationSlug) {
      throw new InternalServerErrorException(
        'Configuration HelloAsso manquante : HELLOASSO_ORGANIZATION_SLUG',
      );
    }
    return `${this.apiBaseUrl()}/organizations/${organizationSlug}/checkout-intents`;
  }

  private getFrontUrl(): string {
    const raw = process.env.HELLOASSO_FRONT_URL ?? process.env.FRONT_URL;
    if (!raw) {
      throw new InternalServerErrorException(
        'Configuration manquante : HELLOASSO_FRONT_URL ou FRONT_URL',
      );
    }
    const normalized = raw.trim().replace(/\/+$/, '');
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') {
      throw new InternalServerErrorException(
        `URL de retour HelloAsso invalide : ${normalized}. HelloAsso exige une URL HTTPS publique. Utilise HELLOASSO_FRONT_URL avec un tunnel HTTPS ou une URL déployée.`,
      );
    }
    return normalized;
  }

  private buildFrontUrl(frontUrl: string, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${frontUrl}${normalizedPath}`;
  }

  private subscriptionIdFromReturnPath(path: string): number | null {
    try {
      const parsed = new URL(path, 'https://assolutions.local');
      const value = Number(parsed.searchParams.get('sid'));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private extractHelloAssoError(text: string, status: number): string {
    try {
      const parsed = JSON.parse(text);
      const messages = Array.isArray(parsed?.errors)
        ? parsed.errors
            .map((error: any) => String(error?.message ?? '').trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
      if (messages.length) return `HelloAsso : ${messages.join(' · ')}`;
    } catch {
      // Ne jamais renvoyer ni journaliser le corps brut d'une erreur externe.
    }
    return `Erreur HelloAsso (${status})`;
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
