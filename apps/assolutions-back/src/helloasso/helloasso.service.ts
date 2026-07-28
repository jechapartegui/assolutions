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

type HelloAssoCheckoutResponse = {
  id: number;
  redirectUrl: string;
};

@Injectable()
export class HelloAssoService {
  private readonly logger = new Logger(HelloAssoService.name);

  async createTestCheckout() {
    
    this.logger.log('=== HELLOASSO POC / createTestCheckout START ===');

    this.logEnvState();

    const accessToken = await this.getAccessToken();

    const frontUrl = this.getFrontUrl();

    const backUrl = `${frontUrl}/helloasso-test`;
    const errorUrl = `${frontUrl}/helloasso-test-erreur`;
    const returnUrl = `${frontUrl}/helloasso-test-ok`;

    this.logger.log(`[HELLOASSO] backUrl   = ${backUrl}`);
    this.logger.log(`[HELLOASSO] errorUrl  = ${errorUrl}`);
    this.logger.log(`[HELLOASSO] returnUrl = ${returnUrl}`);

    /**
     * POC minimal :
     * 1 paiement de 1 €
     * PAS de metadata pour éviter une erreur parasite.
     */
    const payload = {
      totalAmount: 100,
      initialAmount: 100,
      itemName: 'POC Assolutions - adhesion',
      backUrl,
      errorUrl,
      returnUrl,
      containsDonation: false,

      payer: {
  firstName: 'Jean-Emmanuel',
  lastName: 'Chapartegui',
  email: 'jechapartegui@gmail.com',
},
    };

    this.logger.log('[HELLOASSO] Payload checkout envoyé :');
    this.logger.log(JSON.stringify(payload, null, 2));

    const checkout = await this.createCheckoutIntent(accessToken, payload);

    this.logger.log(`[HELLOASSO] Checkout OK id=${checkout.id}`);
    this.logger.log(`[HELLOASSO] redirectUrl=${checkout.redirectUrl}`);
    this.logger.log('=== HELLOASSO POC / createTestCheckout END ===');

    return {
      ok: true,
      checkoutIntentId: checkout.id,
      redirectUrl: checkout.redirectUrl,
    };
  }

  private async getAccessToken(): Promise<string> {
    const clientId = process.env.HELLOASSO_CLIENT_ID;
    const clientSecret = process.env.HELLOASSO_CLIENT_SECRET;
    const oauthUrl =
      process.env.HELLOASSO_OAUTH_URL ??
      'https://api.helloasso.com/oauth2/token';

    this.logger.log('[HELLOASSO] Demande token OAuth');
    this.logger.log(`[HELLOASSO] oauthUrl = ${oauthUrl}`);
    this.logger.log(
      `[HELLOASSO] clientId présent = ${clientId ? 'OUI' : 'NON'}`,
    );
    this.logger.log(
      `[HELLOASSO] clientSecret présent = ${clientSecret ? 'OUI' : 'NON'}`,
    );

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

    this.logger.log(`[HELLOASSO] Token HTTP status = ${response.status}`);

    if (!response.ok) {
      this.logger.error('[HELLOASSO] Erreur token brute :');
      this.logger.error(responseText);

      throw new InternalServerErrorException(
        `Erreur token HelloAsso ${response.status} : ${responseText}`,
      );
    }

    let data: HelloAssoTokenResponse;

    try {
      data = JSON.parse(responseText) as HelloAssoTokenResponse;
    } catch (error) {
      this.logger.error('[HELLOASSO] Réponse token non JSON :');
      this.logger.error(responseText);

      throw new InternalServerErrorException(
        'Réponse token HelloAsso non JSON',
      );
    }

    if (!data.access_token) {
      this.logger.error('[HELLOASSO] Réponse token sans access_token :');
      this.logger.error(JSON.stringify(data, null, 2));

      throw new InternalServerErrorException(
        'Réponse HelloAsso invalide : access_token absent',
      );
    }

    this.logger.log(
      `[HELLOASSO] Token OK type=${data.token_type}, expires_in=${data.expires_in}`,
    );

    return data.access_token;
  }

  private async createCheckoutIntent(
    accessToken: string,
    payload: unknown,
  ): Promise<HelloAssoCheckoutResponse> {
    const apiUrl =
      process.env.HELLOASSO_API_URL ?? 'https://api.helloasso.com/v5';

    const organizationSlug = process.env.HELLOASSO_ORGANIZATION_SLUG;

    this.logger.log('[HELLOASSO] Création checkout intent');
    this.logger.log(`[HELLOASSO] apiUrl = ${apiUrl}`);
    this.logger.log(
      `[HELLOASSO] organizationSlug = ${organizationSlug || 'ABSENT'}`,
    );

    if (!organizationSlug) {
      throw new InternalServerErrorException(
        'Configuration HelloAsso manquante : HELLOASSO_ORGANIZATION_SLUG',
      );
    }

    const url = `${apiUrl}/organizations/${organizationSlug}/checkout-intents`;

    this.logger.log(`[HELLOASSO] POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    this.logger.log(`[HELLOASSO] Checkout HTTP status = ${response.status}`);

    if (!response.ok) {
      this.logger.error('[HELLOASSO] Erreur checkout brute :');
      this.logger.error(responseText);

      this.logger.error('[HELLOASSO] Payload qui a provoqué erreur :');
      this.logger.error(JSON.stringify(payload, null, 2));

      throw new InternalServerErrorException(
        `Erreur checkout HelloAsso ${response.status} : ${responseText}`,
      );
    }

    let data: HelloAssoCheckoutResponse;

    try {
      data = JSON.parse(responseText) as HelloAssoCheckoutResponse;
    } catch (error) {
      this.logger.error('[HELLOASSO] Réponse checkout non JSON :');
      this.logger.error(responseText);

      throw new InternalServerErrorException(
        'Réponse checkout HelloAsso non JSON',
      );
    }

    if (!data.id || !data.redirectUrl) {
      this.logger.error('[HELLOASSO] Réponse checkout invalide :');
      this.logger.error(JSON.stringify(data, null, 2));

      throw new InternalServerErrorException(
        `Réponse HelloAsso invalide : ${JSON.stringify(data)}`,
      );
    }

    return data;
  }

  private getFrontUrl(): string {
    const rawFrontUrl = process.env.FRONT_URL;

    if (!rawFrontUrl) {
      throw new InternalServerErrorException(
        'Configuration manquante : FRONT_URL',
      );
    }

    const frontUrl = rawFrontUrl.trim().replace(/\/+$/, '');

    try {
      const parsed = new URL(frontUrl);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Protocole invalide');
      }

      /**
       * Pour HelloAsso, privilégier une vraie URL publique HTTPS.
       * On laisse http://localhost possible pour test local,
       * mais si HelloAsso le refuse, utiliser la recette.
       */
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        this.logger.warn(
          `[HELLOASSO] FRONT_URL pointe vers localhost : ${frontUrl}. Si HelloAsso refuse BackUrl, utilise une URL publique HTTPS.`,
        );
      }

      return frontUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `FRONT_URL invalide : "${rawFrontUrl}"`,
      );
    }
  }

  private logEnvState(): void {
    this.logger.log(`[ENV] NODE_ENV = ${process.env.NODE_ENV || 'non défini'}`);
    this.logger.log(
      `[ENV] HELLOASSO_CLIENT_ID présent = ${
        process.env.HELLOASSO_CLIENT_ID ? 'OUI' : 'NON'
      }`,
    );
    this.logger.log(
      `[ENV] HELLOASSO_CLIENT_SECRET présent = ${
        process.env.HELLOASSO_CLIENT_SECRET ? 'OUI' : 'NON'
      }`,
    );
    this.logger.log(
      `[ENV] HELLOASSO_ORGANIZATION_SLUG = ${
        process.env.HELLOASSO_ORGANIZATION_SLUG || 'ABSENT'
      }`,
    );
    this.logger.log(
      `[ENV] HELLOASSO_API_URL = ${
        process.env.HELLOASSO_API_URL || 'valeur par défaut'
      }`,
    );
    this.logger.log(
      `[ENV] HELLOASSO_OAUTH_URL = ${
        process.env.HELLOASSO_OAUTH_URL || 'valeur par défaut'
      }`,
    );
    this.logger.log(
      `[ENV] FRONT_URL = ${process.env.FRONT_URL || 'ABSENT'}`,
    );
  }
}