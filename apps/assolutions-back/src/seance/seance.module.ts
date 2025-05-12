import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.services';
import { Compte } from '../app/bdd/compte';
import { InscriptionSaison } from '../app/bdd/inscription-saison';
import { AdherentProjet } from '../app/bdd/member_project';
import { Projet } from '../app/bdd/project';
import { Adherent } from '../app/bdd/riders';
import { Seance } from '../app/bdd/seance';
import { LienGroupe } from '../app/bdd/lien-groupe';
import { Cours } from '../app/bdd/cours';
import { InscriptionSeance } from '../app/bdd/inscription-seance';
import { Saison } from '../app/bdd/saison';
import { SeanceProfesseur } from '../app/bdd/seance_professeur';

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
