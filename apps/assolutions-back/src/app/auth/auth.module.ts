import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../bdd/compte';
import { Adherent } from '../bdd/riders';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { ProjetLogin } from '../bdd/project_login';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { ProjectService } from '../project/project.service';
import { Saison } from '../bdd/saison';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet, ProjetLogin, GestionnaireProjet, ProfesseurSaison, Saison]), // ✅ indispensable
  ],
  providers: [AuthService, ProjectService],
  controllers: [AuthController],
})
export class AuthModule {}
