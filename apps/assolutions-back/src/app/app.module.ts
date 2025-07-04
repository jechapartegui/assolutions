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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
        type: 'postgres',
      url: process.env.DATABASE_URL,    // ou host/port/user/pass/db
      ssl: { rejectUnauthorized: false },// si nécessaire sur Render
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migration/**/*{.ts,.js}'],
      synchronize: false,               // ne jamais true en prod
      namingStrategy: new SnakeNamingStrategy(),
        }),
    AuthModule, MemberModule, SeanceModule, ProjectModule, LieuModule, ProfModule, InscriptionSeanceModule, SaisonModule, CoursModule, GroupeModule, DocumentModule
  ],  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
