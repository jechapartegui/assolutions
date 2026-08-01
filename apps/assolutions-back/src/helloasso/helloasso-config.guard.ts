import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class HelloAssoConfigGuard implements OnModuleInit {
  private readonly logger = new Logger(HelloAssoConfigGuard.name);

  onModuleInit(): void {
    const frontUrl = (process.env.HELLOASSO_FRONT_URL ?? process.env.FRONT_URL ?? '')
      .trim()
      .replace(/\/+$/, '');
    const environment = (process.env.HELLOASSO_ENV ?? 'sandbox').trim().toLowerCase();
    const apiUrl = (process.env.HELLOASSO_API_URL ?? '').trim().toLowerCase();
    const oauthUrl = (process.env.HELLOASSO_OAUTH_URL ?? '').trim().toLowerCase();

    if (!frontUrl) {
      throw new Error('HELLOASSO_FRONT_URL ou FRONT_URL est obligatoire');
    }

    const parsed = new URL(frontUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error(`HELLOASSO_FRONT_URL doit être en HTTPS : ${frontUrl}`);
    }

    const hostname = parsed.hostname.toLowerCase();
    const isPreprodHost = hostname === 'preprod.assolutions.club';
    const isProductionHost = hostname === 'assolutions.club';
    const isSandbox = environment === 'sandbox';
    const isProduction = environment === 'production' || environment === 'prod';

    if (!isSandbox && !isProduction) {
      throw new Error(`HELLOASSO_ENV invalide : ${environment}`);
    }

    if (isPreprodHost && !isSandbox) {
      throw new Error(
        'Configuration dangereuse : preprod.assolutions.club doit utiliser HELLOASSO_ENV=sandbox',
      );
    }

    if (isProductionHost && !isProduction) {
      throw new Error(
        'Configuration invalide : assolutions.club doit utiliser HELLOASSO_ENV=production',
      );
    }

    if (isSandbox) {
      if (apiUrl && !apiUrl.includes('helloasso-sandbox.com')) {
        throw new Error('HELLOASSO_API_URL doit pointer vers le sandbox en préproduction');
      }
      if (oauthUrl && !oauthUrl.includes('helloasso-sandbox.com')) {
        throw new Error('HELLOASSO_OAUTH_URL doit pointer vers le sandbox en préproduction');
      }
    }

    if (isProduction) {
      if (apiUrl && apiUrl.includes('sandbox')) {
        throw new Error('HELLOASSO_API_URL ne doit pas pointer vers le sandbox en production');
      }
      if (oauthUrl && oauthUrl.includes('sandbox')) {
        throw new Error('HELLOASSO_OAUTH_URL ne doit pas pointer vers le sandbox en production');
      }
    }

    this.logger.log(
      `[HELLOASSO] configuration validée environnement=${isSandbox ? 'sandbox' : 'production'} front=${frontUrl}`,
    );
  }
}
