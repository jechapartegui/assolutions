import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../bdd/compte';
import { Adherent } from '../bdd/riders';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { Saison } from '../bdd/saison';
import { Seance } from '../bdd/seance';
import { LienGroupe } from '../bdd/lien-groupe';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { Professeur } from '../bdd/professeur';
import { Cours } from '../bdd/cours';
import { Lieu } from '../bdd/lieu';
import { ProjetLogin } from '../bdd/project_login';
import { Groupe } from '../bdd/groupe';
import { CoursService } from './cours.services';
import { CoursController } from './cours.controller';
import { CoursProfesseur } from '../bdd/cours_professeur';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
        ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison, Groupe, CoursProfesseur  
    ]),
  ],
  providers: [CoursService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
