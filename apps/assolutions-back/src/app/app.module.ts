import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { Compte } from './bdd/compte';
import { Adherent } from './bdd/riders';
import { AdherentProjet } from './bdd/member_project';
import { Projet } from './bdd/project';
import { APP_GUARD } from '@nestjs/core';
import { PasswordGuard } from '../guards/password.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost', // ou distant
      port: 3306,
      username: 'root',
      password: '',
      database: 'maseance',
      entities: [Compte, Adherent, AdherentProjet, Projet],
      synchronize: false, // true uniquement si tu veux que TypeORM crée/modifie les tables tout seul
    }),
    AuthModule
  ],  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
