import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, Request, Response, urlencoded } from 'express';
import { DataSource } from 'typeorm';
import { AppModule } from './app/app.module';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    response.status(status).json(
      typeof body === 'string'
        ? { statusCode: status, message: body }
        : body,
    );
  }
}

type RateBucket = { count: number; resetAt: number };

function installRateLimit(
  app: any,
  options: {
    name: string;
    max: number;
    windowMs: number;
    match: (req: Request) => boolean;
  },
) {
  const buckets = new Map<string, RateBucket>();

  app.use((req: Request, res: Response, next: () => void) => {
    if (req.method === 'OPTIONS' || !options.match(req)) return next();

    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.name}:${ip}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(options.max - bucket.count, 0);
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > options.max) {
      const retryAfter = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        statusCode: 429,
        message: 'TOO_MANY_REQUESTS',
      });
      return;
    }

    if (buckets.size > 5000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    next();
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const config = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const port = Number(config.get<string>('PORT') || 3000);
  const frontUrl = config.get<string>('FRONT_URL');
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  const appEnv = (config.get<string>('APP_ENV') || '').trim().toLowerCase();
  const appEnvLabel = config.get<string>('APP_ENV_LABEL') || 'UNKNOWN';
  const nodeEnv = config.get<string>('NODE_ENV') || 'development';
  const smtpHost = config.get<string>('SMTP_HOST') || 'not set';
  const mailSandbox = config.get<string>('MAIL_SANDBOX') || 'false';
  const databaseUrlDefined = !!config.get<string>('DATABASE_URL');

  const allowedOrigins = new Set(
    [
      ...(corsOrigins ?? '').split(','),
      frontUrl ?? '',
    ]
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  if (!allowedOrigins.size) {
    throw new Error('FRONT_URL or CORS_ORIGINS must be configured');
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);

      logger.warn(`CORS refusé pour origin=${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'projectid',
      'project-id',
      'x-project-id',
      'dateref',
      'lang',
      // Compatibilité temporaire avec GlobalService. Ce header n'est jamais
      // utilisé comme preuve d'identité : l'identité vient exclusivement du JWT.
      'userid',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));

  app.use((req: Request, res: Response, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );

    const proto = String(req.headers['x-forwarded-proto'] ?? req.protocol ?? '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    if (proto === 'https') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  // La simulation de paiement est un outil de développement. Elle est fermée
  // par défaut et n'existe fonctionnellement que si APP_ENV vaut exactement local.
  app.use((req: Request, res: Response, next: () => void) => {
    const path = String(req.path ?? '').replace(/\/$/, '');
    const isPaymentSimulation =
      req.method === 'POST' &&
      /^\/api\/souscriptions\/\d+\/simuler-paiement$/.test(path);

    if (isPaymentSimulation && appEnv !== 'local') {
      res.status(403).json({
        statusCode: 403,
        message: 'Simulation disponible uniquement en local',
      });
      return;
    }

    next();
  });

  const authPaths = new Set([
    '/api/auth/prelogin',
    '/api/auth/login',
    '/api/auth/reinit_mdp',
    '/api/auth/check-reset-token',
    '/api/auth/set-password-with-token',
    '/api/comptes/resend-activation',
    '/api/comptes/check-token',
    '/api/comptes/register-with-project',
  ]);

  installRateLimit(app, {
    name: 'auth',
    max: 20,
    windowMs: 15 * 60 * 1000,
    match: (req) => authPaths.has(String(req.path ?? '').replace(/\/$/, '')),
  });

  installRateLimit(app, {
    name: 'api',
    max: 600,
    windowMs: 60 * 1000,
    match: (req) => String(req.path ?? '').startsWith('/api/'),
  });

  app.setGlobalPrefix('api');

  const dataSource = app.get(DataSource);

  logger.log(`APP_ENV_LABEL = ${appEnvLabel}`);
  logger.log(`NODE_ENV = ${nodeEnv}`);
  logger.log(`PORT = ${port}`);
  logger.log(`FRONT_URL = ${frontUrl || 'not set'}`);
  logger.log(
    `CORS_ORIGINS = ${allowedOrigins.size ? [...allowedOrigins].join(', ') : 'not set'}`,
  );
  logger.log(`SMTP_HOST = ${smtpHost}`);
  logger.log(`MAIL_SANDBOX = ${mailSandbox}`);
  logger.log(`DATABASE_URL defined = ${databaseUrlDefined ? 'yes' : 'no'}`);
  logger.log(`Loaded entities: ${dataSource.entityMetadatas.length}`);

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}

bootstrap();
