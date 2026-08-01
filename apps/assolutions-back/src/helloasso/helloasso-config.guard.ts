import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class HelloAssoConfigGuard implements OnModuleInit {
  private readonly logger = new Logger(HelloAssoConfigGuard.name);

  onModuleInit(): void {
    const appEnvironment = this.appEnvironment();
    const helloAssoEnvironment = (process.env.HELLOASSO_ENV ?? 'sandbox')
      .trim()
      .toLowerCase();
    const frontUrl = (
      process.env.HELLOASSO_FRONT_URL ??
      process.env.FRONT_URL ??
      ''
    )
      .trim()
      .replace(/\/+$/, '');
    const apiUrl = (process.env.HELLOASSO_API_URL ?? '')
      .trim()
      .toLowerCase();
    const oauthUrl = (process.env.HELLOASSO_OAUTH_URL ?? '')
      .trim()
      .toLowerCase();

    const isSandbox = helloAssoEnvironment === 'sandbox';
    const isProduction =
      helloAssoEnvironment === 'production' || helloAssoEnvironment === 'prod';

    if (!isSandbox && !isProduction) {
      throw new Error(`HELLOASSO_ENV invalide : ${helloAssoEnvironment}`);
    }

    this.validateApiUrls(isSandbox, apiUrl, oauthUrl);

    if (appEnvironment === 'local') {
      if (!isSandbox) {
        throw new Error(
          'Configuration dangereuse : le développement local doit utiliser HELLOASSO_ENV=sandbox',
        );
      }

      if (!frontUrl) {
        this.logger.warn(
          '[HELLOASSO] environnement local : aucune URL de retour configurée. Le back démarre, mais le checkout HelloAsso sera indisponible.',
        );
        return;
      }

      const parsed = this.parseUrl(frontUrl);
      if (parsed.protocol !== 'https:') {
        this.logger.warn(
          `[HELLOASSO] environnement local : ${frontUrl} n'est pas une URL HTTPS publique. Le back démarre normalement, mais un checkout HelloAsso échouera tant que HELLOASSO_FRONT_URL ne pointera pas vers une URL HTTPS.`,
        );
        return;
      }

      this.logger.log(
        `[HELLOASSO] configuration locale validée environnement=sandbox callbacks=${frontUrl}`,
      );
      return;
    }

    if (!frontUrl) {
      throw new Error('HELLOASSO_FRONT_URL ou FRONT_URL est obligatoire');
    }

    const parsed = this.parseUrl(frontUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error(`HELLOASSO_FRONT_URL doit être en HTTPS : ${frontUrl}`);
    }

    const hostname = parsed.hostname.toLowerCase();

    if (appEnvironment === 'preprod') {
      if (hostname !== 'preprod.assolutions.club') {
        throw new Error(
          `La préproduction doit utiliser HELLOASSO_FRONT_URL=https://preprod.assolutions.club, reçu : ${frontUrl}`,
        );
      }
      if (!isSandbox) {
        throw new Error(
          'Configuration dangereuse : la préproduction doit utiliser HELLOASSO_ENV=sandbox',
        );
      }
    }

    if (appEnvironment === 'production') {
      if (hostname !== 'assolutions.club') {
        throw new Error(
          `La production doit utiliser HELLOASSO_FRONT_URL=https://assolutions.club, reçu : ${frontUrl}`,
        );
      }
      if (!isProduction) {
        throw new Error(
          'Configuration invalide : la production doit utiliser HELLOASSO_ENV=production',
        );
      }
    }

    this.logger.log(
      `[HELLOASSO] configuration validée application=${appEnvironment} environnement=${
        isSandbox ? 'sandbox' : 'production'
      } front=${frontUrl}`,
    );
  }

  private appEnvironment(): 'local' | 'preprod' | 'production' {
    const explicit = (process.env.APP_ENV ?? '')
      .trim()
      .toLowerCase();

    if (explicit === 'preprod' || explicit === 'preproduction') {
      return 'preprod';
    }
    if (explicit === 'production' || explicit === 'prod') {
      return 'production';
    }
    return 'local';
  }

  private validateApiUrls(
    isSandbox: boolean,
    apiUrl: string,
    oauthUrl: string,
  ): void {
    if (isSandbox) {
      if (apiUrl && !apiUrl.includes('helloasso-sandbox.com')) {
        throw new Error(
          'HELLOASSO_API_URL doit pointer vers api.helloasso-sandbox.com lorsque HELLOASSO_ENV=sandbox',
        );
      }
      if (oauthUrl && !oauthUrl.includes('helloasso-sandbox.com')) {
        throw new Error(
          'HELLOASSO_OAUTH_URL doit pointer vers api.helloasso-sandbox.com lorsque HELLOASSO_ENV=sandbox',
        );
      }
      return;
    }

    if (apiUrl && apiUrl.includes('sandbox')) {
      throw new Error(
        'HELLOASSO_API_URL ne doit pas pointer vers le sandbox lorsque HELLOASSO_ENV=production',
      );
    }
    if (oauthUrl && oauthUrl.includes('sandbox')) {
      throw new Error(
        'HELLOASSO_OAUTH_URL ne doit pas pointer vers le sandbox lorsque HELLOASSO_ENV=production',
      );
    }
  }

  private parseUrl(value: string): URL {
    try {
      return new URL(value);
    } catch {
      throw new Error(`HELLOASSO_FRONT_URL invalide : ${value}`);
    }
  }
}
