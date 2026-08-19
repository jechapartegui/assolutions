import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, Response, urlencoded } from 'express';
import { DataSource } from 'typeorm';
import { AppModule } from './app/app.module';
import { securityRateLimit } from './common/security/rate-limit.middleware';

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

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['log', 'error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const port = Number(config.get<string>('PORT') || 3000);
  const frontUrl = config.get<string>('FRONT_URL');
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  const appEnvLabel = config.get<string>('APP_ENV_LABEL') || 'UNKNOWN';
  const nodeEnv = config.get<string>('NODE_ENV') || 'development';
  const smtpHost = config.get<string>('SMTP_HOST') || 'not set';
  const mailSandbox = config.get<string>('MAIL_SANDBOX') || 'false';
  const databaseUrlDefined = !!config.get<string>('DATABASE_URL');
  const bodyLimit = config.get<string>('API_BODY_LIMIT') || '15mb';

  const allowedOrigins = new Set(
    [
      ...(corsOrigins ?? '').split(','),
      frontUrl ?? '',
    ]
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  if (nodeEnv === 'production' && allowedOrigins.size === 0) {
    throw new Error('FRONT_URL or CORS_ORIGINS must be configured in production');
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    validationError: { target: false, value: false },
  }));

  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);

      if (
        nodeEnv !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

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
      'password',
      'dateref',
      'lang',
      'userid',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(securityRateLimit);
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit, parameterLimit: 5_000 }));
  app.setGlobalPrefix('api');

  const dataSource = app.get(DataSource);
  logger.log(`APP_ENV_LABEL = ${appEnvLabel}`);
  logger.log(`NODE_ENV = ${nodeEnv}`);
  logger.log(`PORT = ${port}`);
  logger.log(`FRONT_URL = ${frontUrl || 'not set'}`);
  logger.log(`CORS_ORIGINS configured = ${allowedOrigins.size ? 'yes' : 'no'}`);
  logger.log(`SMTP_HOST = ${smtpHost}`);
  logger.log(`MAIL_SANDBOX = ${mailSandbox}`);
  logger.log(`DATABASE_URL defined = ${databaseUrlDefined ? 'yes' : 'no'}`);
  logger.log(`API_BODY_LIMIT = ${bodyLimit}`);
  logger.log(`Loaded entities: ${dataSource.entityMetadatas.length}`);

  await app.listen(port);
  logger.log(`Application is running on port ${port} with /api prefix`);
}

bootstrap();
