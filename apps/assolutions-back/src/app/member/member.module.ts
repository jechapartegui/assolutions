import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../bdd/compte';
import { Adherent } from '../bdd/riders';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { MemberController } from './member.controller';
import { MemberService } from './member.services';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { Saison } from '../bdd/saison';
import { Seance } from '../bdd/seance';
import { ProjectService } from '../project/project.service';
import { SeanceService } from '../seance/seance.services';
import { ProfService } from '../prof/prof.services';
import { GroupeService } from '../groupe/groupe.service';
import { LienGroupe } from '../bdd/lien-groupe';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { Professeur } from '../bdd/professeur';
import { Cours } from '../bdd/cours';
import { Lieu } from '../bdd/lieu';
import { ProjetLogin } from '../bdd/project_login';
import { Groupe } from '../bdd/groupe';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
        ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison, Groupe
    ]),
  ],
  providers: [MemberService, ProjectService, SeanceService, GroupeService, ProfService],
  controllers: [MemberController],
  exports: [MemberService], // 👈 ajoute ça
})
export class MemberModule {}
