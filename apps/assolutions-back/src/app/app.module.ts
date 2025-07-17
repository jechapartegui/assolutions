import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PasswordGuard } from './guards/password.guard';
import { MemberModule } from './member/member.module';
import { SeanceModule } from './seance/seance.module';
import { ProjectModule } from './project/project.module';
import { LieuModule } from './lieu/lieu.module';
import { ProfModule } from './prof/prof.module';
import { InscriptionSeanceModule } from './inscription_seance/inscription_seance.module';
import { SaisonModule } from './saison/saison.module';
import { CoursModule } from './cours/cours.module';
import { GroupeModule } from './groupe/groupe.module';
import { DocumentModule } from './document/document.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import { InscriptionSaisonModule } from './inscription_saison/inscription_saison.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  entities: [
    // pour les .js compilés en prod
    join(__dirname, '../entities', '*.entity.js'),
    // pour les .ts en dev (ts-node-dev)
    join(__dirname, '../entities', '*.entity.ts'),
  ],
  migrations: [join(__dirname, 'migration', '*{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  namingStrategy: new SnakeNamingStrategy(),
  logging: ['schema'],
}),
    AuthModule, MemberModule, SeanceModule, ProjectModule, LieuModule, ProfModule, InscriptionSeanceModule, SaisonModule, CoursModule, GroupeModule, DocumentModule, InscriptionSaisonModule
  ],  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
