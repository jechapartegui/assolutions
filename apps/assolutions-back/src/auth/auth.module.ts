import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../app/bdd/compte';
import { Adherent } from '../app/bdd/riders';
import { AdherentProjet } from '../app/bdd/member_project';
import { Projet } from '../app/bdd/project';
import { ProjetLogin } from '../app/bdd/project_login';
import { GestionnaireProjet } from '../app/bdd/gestionnaire_projet';
import { ProfesseurSaison } from '../app/bdd/prof-saison';
import { ProjectService } from '../app/project/project.service';
import { Saison } from '../app/bdd/saison';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet, ProjetLogin, GestionnaireProjet, ProfesseurSaison, Saison]), // ✅ indispensable
  ],
  providers: [AuthService, ProjectService],
  controllers: [AuthController],
})
export class AuthModule {}
