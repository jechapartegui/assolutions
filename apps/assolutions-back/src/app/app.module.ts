import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PasswordGuard } from './guards/password.guard';

import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { SeanceModule } from './seance/seance.module';
import { ProjetModule } from './project/project.module';
import { LieuModule } from './lieu/lieu.module';
import { ProfModule } from './prof/prof.module';
import { InscriptionSeanceModule } from './inscription_seance/inscription_seance.module';
import { SaisonModule } from './saison/saison.module';
import { CoursModule } from './cours/cours.module';
import { GroupeModule } from './groupe/groupe.module';
import { DocumentModule } from './document/document.module';
import { InscriptionSaisonModule } from './inscription_saison/inscription_saison.module';
import { CoursProfModule } from './cours_prof/cours_prof.module';
import { MailerModule } from './mail/mailer.module';
import { MessagesModule } from './messages/messages.module';

import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ✅ TypeORM config qui marche en dev & prod
    TypeOrmModule.forRootAsync({
  useFactory: (cfg: ConfigService) => {
    const isProd = cfg.get('NODE_ENV') === 'production';
    const ssl = isProd ? { rejectUnauthorized: false } : false;

    return {
      type: 'postgres',
      url: cfg.get<string>('DATABASE_URL') || undefined,
      host: cfg.get<string>('PGHOST'),
      port: parseInt(cfg.get<string>('PGPORT') ?? '5432', 10),
      username: cfg.get<string>('PGUSER'),
      password: cfg.get<string>('PGPASSWORD'),
      database: cfg.get<string>('PGDATABASE'),

      // 🔥 Ajoute ceci :
      entities: [
        // dev (ts-node)
        join(__dirname, '..', 'entities', '*.entity.ts'),
        // prod (node sur dist)
        join(__dirname, '..', 'entities', '*.entity.js'),
      ],

      // Tu peux garder autoLoadEntities si tu veux, mais avec entities ça suffit :
      autoLoadEntities: false,

      synchronize: (cfg.get('DB_SYNCHRONIZE') ?? '').toString().toLowerCase() === 'true'
        ? true
        : !isProd,
      migrations: [join(__dirname, '..', 'migration', '*{.ts,.js}')],
      namingStrategy: new SnakeNamingStrategy(),
      ssl,
      extra: isProd ? { ssl } : undefined,
      logging: isProd ? ['error', 'warn'] : ['schema', 'error', 'warn'],
    };
  },
  inject: [ConfigService],
})
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
