import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../app/bdd/compte';
import { Adherent } from '../app/bdd/riders';
import { AdherentProjet } from '../app/bdd/member_project';
import { Projet } from '../app/bdd/project';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet]), // ✅ indispensable
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
