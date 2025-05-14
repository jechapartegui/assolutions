import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { Professeur } from '../bdd/professeur';
import { Adherent } from '../bdd/riders';
import { Compte } from '../bdd/compte';
import { Cours } from '../bdd/cours';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { LienGroupe } from '../bdd/lien-groupe';
import { Lieu } from '../bdd/lieu';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { ProjetLogin } from '../bdd/project_login';
import { Saison } from '../bdd/saison';
import { Seance } from '../bdd/seance';
import { SaisonController } from './saison.controller';
import { SaisonService } from './saison.services';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
            ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison
    ]),
  ],
  providers: [SaisonService],
  controllers: [SaisonController],
  exports: [SaisonService], // 👈 ajoute ça
})
export class SaisonModule {}
