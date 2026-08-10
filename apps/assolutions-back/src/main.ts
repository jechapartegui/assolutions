import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, Response, urlencoded } from 'express';
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

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);

  const port = Number(config.get<string>('PORT') || 3000);
  const frontUrl = config.get<string>('FRONT_URL');
  const corsOrigins = config.get<string>('CORS_ORIGINS');
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

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      if (allowedOrigins.size === 0 && origin.startsWith('http')) {
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
      'password',
      'dateref',
      'lang',
      'userid',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.use((req: any, _res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      logger.debug(`OPTIONS ${req.url} origin=${req.headers.origin ?? 'none'}`);
    }
    next();
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
  for (const meta of dataSource.entityMetadatas) {
    logger.debug(`Entity ${meta.name} -> table ${meta.tableName}`);
  }

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();