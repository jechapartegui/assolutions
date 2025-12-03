import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

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
import { AdminModule } from './admin/admin.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProd = (cfg.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const useUrl = !!cfg.get<string>('DATABASE_URL');

        // Synchronize: jamais en prod sauf si explicitement demandé
        const syncEnv = (cfg.get('DB_SYNCHRONIZE') ?? '').toString().toLowerCase();
        const synchronize = !isProd || syncEnv === 'true';

        // SSL seulement quand nécessaire (Render/Postgres)
        const ssl = isProd ? { rejectUnauthorized: false } : undefined;

        // Chemins d’entities & migrations valables en TS (dev) et JS (dist)
        const entities = [join(__dirname, '**', '*.entity.{ts,js}')];
        const migrations = [join(__dirname, '**', 'migration', '*.{ts,js}')];

        if (useUrl) {
          // Config via DATABASE_URL
          return {
            type: 'postgres' as const,
            url: cfg.get<string>('DATABASE_URL')!,
            ssl,
            entities,
            migrations,
            autoLoadEntities: true,
            synchronize,
            namingStrategy: new SnakeNamingStrategy(),
            logging: isProd ? ['error', 'warn'] : ['schema', 'error', 'warn'],
          };
        }

        // Config via variables séparées
        return {
          type: 'postgres' as const,
          host: cfg.get<string>('PGHOST'),
          port: parseInt(cfg.get<string>('PGPORT') ?? '5432', 10),
          username: cfg.get<string>('PGUSER'),
          password: cfg.get<string>('PGPASSWORD'),
          database: cfg.get<string>('PGDATABASE'),
          ssl,
          entities,
          migrations,
          autoLoadEntities: true,
          synchronize,
          namingStrategy: new SnakeNamingStrategy(),
          logging: isProd ? ['error', 'warn'] : ['schema', 'error', 'warn'],
        };
      },
    }),

    AuthModule,
    MemberModule,
    MessagesModule,
    MailerModule,
    CoursProfModule,
    SeanceModule,
    ProjetModule,
    LieuModule,
    ProfModule,
    InscriptionSeanceModule,
    SaisonModule,
    CoursModule,
    GroupeModule,
    DocumentModule,
    AdminModule,
    InscriptionSaisonModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
