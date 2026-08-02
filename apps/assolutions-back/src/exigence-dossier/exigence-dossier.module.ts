import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { ExigenceDossierController } from './exigence-dossier.controller';
import { ExigenceDossierEntity } from './exigence-dossier.entity';
import { ExigenceDossierPorteeEntity } from './exigence-dossier-portee.entity';
import { ReponseExigenceDossierEntity } from './reponse-exigence-dossier.entity';
import { ExigenceDossierService } from './exigence-dossier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExigenceDossierEntity,
      ExigenceDossierPorteeEntity,
      ReponseExigenceDossierEntity,
      SaisonEntity,
      GroupesEntity,
      TarifInscriptionEntity,
    ]),
  ],
  controllers: [ExigenceDossierController],
  providers: [ExigenceDossierService],
  exports: [ExigenceDossierService, TypeOrmModule],
})
export class ExigenceDossierModule {}
