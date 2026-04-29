// helloasso.service.ts
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { HelloAssoConfig } from '../class/helloasso.config';
import { HelloAssoCheckoutIntentDetails, HelloAssoCheckoutIntentRequest, HelloAssoCheckoutIntentResponse } from '../class/helloasso.types';
import { buildHelloAssoPayload } from '../mapper/helloasso.mapper';
import { CommandeAdhesion } from '@shared/index';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class HelloAssoService {
  private readonly logger = new Logger(HelloAssoService.name);

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly http: HttpClient,
    private readonly config: HelloAssoConfig,
  ) {}

  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000;
  }

  private async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken!;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await firstValueFrom(
      this.http.post(
        this.config.oauthUrl,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    const data = response.data as {
      access_token: string;
      expires_in: string | number;
      token_type: string;
    };

    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + Number(data.expires_in) * 1000;

    return this.accessToken;
  }

  private async authHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createCheckoutIntent(commande: CommandeAdhesion): Promise<HelloAssoCheckoutIntentResponse> {
    const payload: HelloAssoCheckoutIntentRequest = buildHelloAssoPayload(commande, {
      backUrl: this.config.backUrl,
      errorUrl: this.config.errorUrl,
      returnUrl: this.config.returnUrl,
    });

    const url = `${this.config.baseUrl}/organizations/${this.config.organizationSlug}/checkout-intents`;

    try {
      const response = await firstValueFrom(
        this.http.post(url, payload, {
          headers: await this.authHeaders(),
        }),
      );

      return response.data as HelloAssoCheckoutIntentResponse;
    } catch (error: any) {
      this.logger.error('HelloAsso createCheckoutIntent failed', error?.response?.data || error);
      throw new BadGatewayException('Erreur HelloAsso lors de la création du paiement.');
    }
  }

  async getCheckoutIntent(checkoutIntentId: string): Promise<HelloAssoCheckoutIntentDetails> {
    const url =
      `${this.config.baseUrl}/organizations/${this.config.organizationSlug}` +
      `/checkout-intents/${encodeURIComponent(checkoutIntentId)}`;

    try {
      const response = await firstValueFrom(
        this.http.get(url, {
          headers: await this.authHeaders(),
        }),
      );

      return response.data as HelloAssoCheckoutIntentDetails;
    } catch (error: any) {
      this.logger.error('HelloAsso getCheckoutIntent failed', error?.response?.data || error);
      throw new BadGatewayException('Erreur HelloAsso lors de la lecture du paiement.');
    }
  }

  /**
   * À adapter selon la structure exacte observée dans tes retours API.
   * Le principe est : si une commande/order existe et qu’un paiement est autorisé/réussi,
   * alors on considère paid.
   */
  computePaymentStatus(intent: HelloAssoCheckoutIntentDetails):
    'paid' | 'pending' | 'failed' {
    const state = (intent.state || '').toLowerCase();

    if (['authorized', 'paid', 'succeeded', 'complete', 'completed'].includes(state)) {
      return 'paid';
    }

    if (['failed', 'refused', 'cancelled', 'canceled', 'error'].includes(state)) {
      return 'failed';
    }

    if (intent.order?.id) {
      return 'paid';
    }

    return 'pending';
  }

  verifyWebhookSignature(rawBody: string, receivedSignature?: string): boolean {
    if (!this.config.webhookSignatureKey || !receivedSignature) {
      return false;
    }

    const expected = createHmac('sha256', this.config.webhookSignatureKey)
      .update(rawBody, 'utf8')
      .digest('hex');

    return expected === receivedSignature;
  }

  isAllowedWebhookIp(ip?: string): boolean {
    if (!ip || !this.config.webhookAllowedIps?.length) return true;
    return this.config.webhookAllowedIps.includes(ip);
  }
}