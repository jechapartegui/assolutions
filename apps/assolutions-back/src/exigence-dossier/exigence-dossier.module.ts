import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contact/contact.entity';
import { DocumentEntity } from '../document/document.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { DossierPersonneController } from './dossier-personne.controller';
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
      PersonneEntity,
      Contact,
      DocumentEntity,
      SaisonEntity,
      GroupesEntity,
      TarifInscriptionEntity,
    ]),
  ],
  controllers: [ExigenceDossierController, DossierPersonneController],
  providers: [ExigenceDossierService],
  exports: [ExigenceDossierService, TypeOrmModule],
})
export class ExigenceDossierModule {}
