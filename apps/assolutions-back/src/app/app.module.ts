import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AddinfoModule } from '../addinfo/addinfo.module';
import { AuthModule } from '../auth/auth.module';
import { CompteModule } from '../compte/compte.module';
import { CompteBancaireModule } from '../compte_bancaire/compte_bancaire.module';
import { AccessControlModule } from '../common/access-control.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ContactModule } from '../contact/contact.module';
import { ContratProfModule } from '../contrat_prof/contrat_prof.module';
import { CoursModule } from '../cours/cours.module';
import { CoursProfesseurModule } from '../cours_professeur/cours_professeur.module';
import { DocumentModule } from '../document/document.module';
import { FinanceModule } from '../finance/finance.module';
import { FluxFinancierModule } from '../flux_financier/flux_financier.module';
import { GroupesModule } from '../groupes/groupes.module';
import { HelloAssoModule } from '../helloasso/helloasso.module';
import { InscriptionSaisonModule } from '../inscription_saison/inscription_saison.module';
import { InscriptionSeanceModule } from '../inscription_seance/inscription_seance.module';
import { LienGroupeModule } from '../lien_groupe/lien_groupe.module';
import { LieuModule } from '../lieu/lieu.module';
import { LoginProjectModule } from '../login_project/login_project.module';
import { MailAccountModule } from '../mail_account/mail_account.module';
import { MailProjectModule } from '../mail_project/mail_project.module';
import { MailRecordModule } from '../mail_record/mail_record.module';
import { MessageModule } from '../message/message.module';
import { NoteModule } from '../note/note.module';
import { OperationModule } from '../operation/operation.module';
import { PersonneModule } from '../personne/personne.module';
import { ProfesseurModule } from '../professeur/professeur.module';
import { ProjectModule } from '../project/project.module';
import { SaisonModule } from '../saison/saison.module';
import { SeanceModule } from '../seance/seance.module';
import { SeanceProfesseurModule } from '../seance_professeur/seance_professeur.module';
import { SouscriptionModule } from '../souscription/souscription.module';
import { StockModule } from '../stock/stock.module';
import { TarifInscriptionModule } from '../tarif_inscription/tarif_inscription.module';
import { AdhesionModule } from './adhesion/adhesion.module';
import { MesSeancesModule } from './mes_seances/mes_seances.module';

function resolveEnvironmentFile(): string {
  const explicit = (process.env.APP_ENV ?? '').trim().toLowerCase();

  if (explicit === 'preprod' || explicit === 'preproduction') {
    return '.env.preprod';
  }

  if (
    explicit === 'production' ||
    explicit === 'prod' ||
    (!explicit && (process.env.NODE_ENV ?? '').toLowerCase() === 'production')
  ) {
    return '.env.production';
  }

  return '.env.local';
}

const environmentFile = resolveEnvironmentFile();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), `apps/assolutions-back/${environmentFile}`),
        join(process.cwd(), environmentFile),
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProd =
          (cfg.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const useUrl = !!cfg.get<string>('DATABASE_URL');
        const syncEnv = (cfg.get('DB_SYNCHRONIZE') ?? '')
          .toString()
          .toLowerCase();
        const synchronize = syncEnv === 'true';
        const ssl = isProd ? { rejectUnauthorized: false } : undefined;
        const entities = [join(__dirname, '..', '**', '*.entity.{ts,js}')];
        const migrations = [join(__dirname, '..', '**', 'migration', '*.{ts,js}')];

        if (useUrl) {
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
            `PGPASSWORD manquant. Vérifie apps/assolutions-back/${environmentFile}`,
          );
        }

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
    CompteModule,
    MesSeancesModule,
    AuthModule,
    AddinfoModule,
    LoginProjectModule,
    ContactModule,
    TarifInscriptionModule,
    SouscriptionModule,
    CompteBancaireModule,
    ContratProfModule,
    MailProjectModule,
    MailRecordModule,
    AccessControlModule,
    AdhesionModule,
    MessageModule,
    FinanceModule,
    HelloAssoModule,
    CoursModule,
    CoursProfesseurModule,
    DocumentModule,
    FluxFinancierModule,
    GroupesModule,
    InscriptionSaisonModule,
    InscriptionSeanceModule,
    LienGroupeModule,
    LieuModule,
    MailAccountModule,
    NoteModule,
    OperationModule,
    PersonneModule,
    ProfesseurModule,
    ProjectModule,
    SaisonModule,
    SeanceModule,
    SeanceProfesseurModule,
    StockModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
