import 'reflect-metadata';
import { HttpException, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { json, Response, urlencoded } from 'express';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { join } from 'path';
import { DataSource } from 'typeorm';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    response
      .status(status)
      .json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body
      );
  }
}


async function bootstrap() {
  console.log(
  'Entity glob pattern now:',
  join(__dirname, 'entities', '*.entity.js')
);

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Configuration CORS explicite et sécurisée
  app.enableCors({
    origin: (origin:any, callback:any) => {
      // Autoriser origin null (ex: fichiers locaux) ou tout ce qui commence par http
      if (!origin || origin.startsWith('http')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
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

  // Log tous les appels OPTIONS (pré-requêtes CORS)
  app.use((req:any, res:any, next:any) => {
    if (req.method === 'OPTIONS') {
      console.log('🛰 OPTIONS Request:', req.headers.origin, req.url);
    }
    next();
  });

  app.setGlobalPrefix('api');
// -- NOUVEAU SNIPPET POUR DEBUG ENTITY LOADING --
const dataSource = app.get(DataSource);
console.log('🔍 Loaded entities:');
dataSource.entityMetadatas.forEach(meta =>
  console.log(`  • ${meta.name} → table: ${meta.tableName}`)
);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();