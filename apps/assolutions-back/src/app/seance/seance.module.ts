import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.services';
import { ProfService } from '../prof/prof.services';
import { Compte } from '../bdd/compte';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { Adherent } from '../bdd/riders';
import { Seance } from '../bdd/seance';
import { LienGroupe } from '../bdd/lien-groupe';
import { Cours } from '../bdd/cours';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { Saison } from '../bdd/saison';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { Professeur } from '../bdd/professeur';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { Lieu } from '../bdd/lieu';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { ProjetLogin } from '../bdd/project_login';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([    InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
        ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison]), // ✅ indispensable
  ],
  providers: [SeanceService, ProfService],
  controllers: [SeanceController],
  exports: [SeanceService], // 👈 ajoute ça
})
export class SeanceModule {}
