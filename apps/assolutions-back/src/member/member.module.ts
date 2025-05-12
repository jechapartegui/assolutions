import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../app/bdd/compte';
import { Adherent } from '../app/bdd/riders';
import { AdherentProjet } from '../app/bdd/member_project';
import { Projet } from '../app/bdd/project';
import { MemberController } from './member.controller';
import { MemberService } from './member.services';
import { InscriptionSaison } from '../app/bdd/inscription-saison';
import { InscriptionSeance } from '../app/bdd/inscription-seance';
import { Saison } from '../app/bdd/saison';
import { Seance } from '../app/bdd/seance';
import { ProjectService } from '../app/project/project.service';
import { SeanceService } from '../seance/seance.services';
import { GroupeService } from '../app/groupe/groupe.service';
import { LienGroupe } from '../app/bdd/lien-groupe';
import { ProfesseurSaison } from '../app/bdd/prof-saison';
import { GestionnaireProjet } from '../app/bdd/gestionnaire_projet';
import { SeanceProfesseur } from '../app/bdd/seance_professeur';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Compte,
      Adherent,
      AdherentProjet,
      Projet,
      Seance,
      InscriptionSaison,
      InscriptionSeance,
      Saison, LienGroupe, ProfesseurSaison, GestionnaireProjet, SeanceProfesseur
    ]),
  ],
  providers: [MemberService, ProjectService, SeanceService, GroupeService],
  controllers: [MemberController],
  exports: [MemberService], // 👈 ajoute ça
})
export class MemberModule {}
