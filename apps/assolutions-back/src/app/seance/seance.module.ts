import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.services';
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

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet, InscriptionSaison, InscriptionSeance, Seance, LienGroupe, Cours, Saison,SeanceProfesseur]), // ✅ indispensable
  ],
  providers: [SeanceService],
  controllers: [SeanceController],
  exports: [SeanceService], // 👈 ajoute ça
})
export class SeanceModule {}
