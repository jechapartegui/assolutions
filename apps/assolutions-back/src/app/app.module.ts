import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from '../auth/auth.module';

import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompteModule } from '../compte/compte.module';
import { RegistryModule } from '../registry/registry.module';
import { AddinfoModule } from '../addinfo/addinfo.module';
import { CompteBancaireModule } from '../compte_bancaire/compte_bancaire.module';
import { ContratProfModule } from '../contrat_prof/contrat_prof.module';
import { MailRecordModule } from '../mail_record/mail_record.module';
import { MailProjectModule } from '../mail_project/mail_project.module';
import { CoursModule } from '../cours/cours.module';
import { CoursProfesseurModule } from '../cours_professeur/cours_professeur.module';
import { DocumentModule } from '../document/document.module';
import { FluxFinancierModule } from '../flux_financier/flux_financier.module';
import { GroupesModule } from '../groupes/groupes.module';
import { InscriptionSeanceModule } from '../inscription_seance/inscription_seance.module';
import { InscriptionSaisonModule } from '../inscription_saison/inscription_saison.module';
import { LienGroupeModule } from '../lien_groupe/lien_groupe.module';
import { LieuModule } from '../lieu/lieu.module';
import { MailAccountModule } from '../mail_account/mail_account.module';
import { NoteModule } from '../note/note.module';
import { OperationModule } from '../operation/operation.module';
import { PersonneModule } from '../personne/personne.module';
import { ProfesseurModule } from '../professeur/professeur.module';
import { ProjectModule } from '../project/project.module';
import { SaisonModule } from '../saison/saison.module';
import { SeanceModule } from '../seance/seance.module';
import { SeanceProfesseurModule } from '../seance_professeur/seance_professeur.module';
import { StockModule } from '../stock/stock.module';
import { AccessControlModule } from '../common/access-control.module';
import { AdhesionModule } from './adhesion/adhesion.module';
import { ContactModule } from '../contact/contact.module';
import { MesSeancesModule } from './mes_seances/mes_seances.module';
import { MessageModule } from '../message/message.module';
import { LoginProjectModule } from '../login_project/login_project.module';

@Module({
  imports: [
   ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    join(process.cwd(), 'apps/assolutions-back/.env.development'),
    join(process.cwd(), 'apps/assolutions-back/.env'),
    join(process.cwd(), '.env'),
  ],
}),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProd = (cfg.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const useUrl = !!cfg.get<string>('DATABASE_URL');

        // Synchronize: jamais en prod sauf si explicitement demandé
const syncEnv = (cfg.get('DB_SYNCHRONIZE') ?? '').toString().toLowerCase();
const synchronize = syncEnv === 'true'; // ✅ jamais automatique


        // SSL seulement quand nécessaire (Render/Postgres)
        const ssl = isProd ? { rejectUnauthorized: false } : undefined;

        // Chemins d’entities & migrations valables en TS (dev) et JS (dist)
const entities = [join(__dirname, '..', '**', '*.entity.{ts,js}')];
const migrations = [join(__dirname, '..', '**', 'migration', '*.{ts,js}')];
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
const password = cfg.get<string>('PGPASSWORD');

if (typeof password !== 'string') {
  throw new Error(
    'PGPASSWORD manquant. Vérifie apps/assolutions-back/.env ou .env.development'
  );
}
        // Config via variables séparées
        return {
       type: 'postgres' as const,
  host: cfg.get<string>('PGHOST') ?? 'localhost',
  port: parseInt(cfg.get<string>('PGPORT') ?? '5432', 10),
  username: cfg.get<string>('PGUSER') ?? 'postgres',
  password,
  database: cfg.get<string>('PGDATABASE') ?? 'assolutions',
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
    CompteModule, MesSeancesModule,
    RegistryModule,
    AuthModule,
    AddinfoModule, LoginProjectModule,
    // MessagesModule,
    CompteModule, ContactModule,
    CompteBancaireModule, ContratProfModule, MailProjectModule, MailRecordModule,  AccessControlModule, AdhesionModule,  MessageModule,
    CoursModule, CoursProfesseurModule, DocumentModule, FluxFinancierModule, GroupesModule, InscriptionSaisonModule, InscriptionSeanceModule, LienGroupeModule, 
    LieuModule, MailAccountModule, NoteModule, OperationModule, PersonneModule, ProfesseurModule, ProjectModule, RegistryModule, SaisonModule, SeanceModule, SeanceProfesseurModule, StockModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
