import 'reflect-metadata';
import { Logger, HttpException, ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { json, urlencoded } from 'express';

// Filtre propre pour renvoyer body/HTTP lisible côté client
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const body = exception.getResponse();
    response.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
  }
}

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  // Logger + niveaux
  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] as any : ['error', 'warn', 'log', 'debug', 'verbose'] as any,
  });

  // CORS : strict en prod, permissif en dev
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman, curl
      if (!isProd) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type', 'Authorization', 'projectid', 'password', 'dateref', 'lang', 'userid',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Body size
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Proxy (utile derrière Render/NGINX si un jour cookies/https trust)
  const adapter = app.getHttpAdapter().getInstance();
  if (adapter?.set) {
    adapter.set('trust proxy', 1);
  }

  // Filtre global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Prefix API
  app.setGlobalPrefix('api');

  // Debug entities uniquement en dev
  if (!isProd) {
    const { DataSource } = await import('typeorm');
    const ds = app.get(DataSource);
    // eslint-disable-next-line no-console
    console.log('🔍 Loaded entities:');
    ds.entityMetadatas.forEach(m => console.log(`  • ${m.name} → table: ${m.tableName}`));
  }

  // Shutdown hooks propres (SIGTERM)
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Ready on http://localhost:${port}/api (${isProd ? 'prod' : 'dev'})`);
}

bootstrap();
