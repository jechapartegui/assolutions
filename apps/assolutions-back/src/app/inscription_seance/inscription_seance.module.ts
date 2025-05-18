import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscriptionSeanceService } from './inscription_seance.services';
import { InscriptionSeanceController } from './inscription_seance.controller';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { SeanceService } from '../seance/seance.services';
import { Seance } from '../bdd/seance';
import { Adherent } from '../bdd/riders';
import { MemberService } from '../member/member.services';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { LienGroupe } from '../bdd/lien-groupe';
import { Cours } from '../bdd/cours';
import { Compte } from '../bdd/compte';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { AdherentProjet } from '../bdd/member_project';
import { Lieu } from '../bdd/lieu';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { Professeur } from '../bdd/professeur';
import { Projet } from '../bdd/project';
import { ProjetLogin } from '../bdd/project_login';
import { Saison } from '../bdd/saison';
import { ProfService } from '../prof/prof.services';
import { ProjectService } from '../project/project.service';
import { GroupeService } from '../groupe/groupe.service';
import { Groupe } from '../bdd/groupe';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
    ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison, Groupe

    ]),
  ],
  providers: [InscriptionSeanceService, SeanceService, MemberService, ProfService, ProjectService, GroupeService],
  controllers: [InscriptionSeanceController],
  exports: [InscriptionSeanceService], // 👈 ajoute ça
})
export class InscriptionSeanceModule {}
