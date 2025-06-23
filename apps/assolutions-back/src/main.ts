import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { json, urlencoded } from 'express';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
class GlobalExceptionLogger implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.error('🌋 GLOBAL ERROR:', exception);
  }
}


async function bootstrap() {
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
  app.useGlobalFilters(new GlobalExceptionLogger());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
