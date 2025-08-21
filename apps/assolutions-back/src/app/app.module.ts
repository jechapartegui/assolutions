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
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProd = cfg.get('NODE_ENV') === 'production';

        // Si tu fournis DATABASE_URL, on l’utilise. Sinon, on lit PGHOST/PGPORT/PGUSER...
        const url = cfg.get<string>('DATABASE_URL');
        const base = url
          ? { url }
          : {
              host: cfg.get<string>('PGHOST', 'localhost'),
              port: parseInt(cfg.get<string>('PGPORT') ?? '5432', 10),
              username: cfg.get<string>('PGUSER', 'postgres'),
              password: cfg.get<string>('PGPASSWORD', ''),
              database: cfg.get<string>('PGDATABASE', 'postgres'),
            };

        // SSL en prod (Render) — rapide : on ne vérifie pas le CA.
        // Si tu as le CA, remplace par: const ssl = { ca: cfg.get('PGSSL_CA') }
        const ssl = isProd ? { rejectUnauthorized: false } : false;

        return {
          type: 'postgres',
          ...base,

          // 👇 plus de galère de chemins: Nest charge automatiquement les @Entity
          autoLoadEntities: true,

          // Migrations (si tu en as) — fonctionne en dev et prod:
          migrations: [join(__dirname, '..', 'migration', '*{.ts,.js}')],

          namingStrategy: new SnakeNamingStrategy(),

          // Dev = synchronize ON par défaut, Prod = OFF (ou force via env DB_SYNCHRONIZE=true)
          synchronize:
            (cfg.get('DB_SYNCHRONIZE') ?? '').toString().toLowerCase() === 'true'
              ? true
              : !isProd,

          // SSL requis par ton provider (Render/Postgres managé)
          ssl,
          extra: isProd ? { ssl } : undefined,

          // Logs plus verbeux en dev
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
    InscriptionSaisonModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
