import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contact/contact.entity';
import { DocumentEntity } from '../document/document.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from '../souscription/souscription-personne-groupe.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { DossierPersonneController } from './dossier-personne.controller';
import { DossierPersonneSaisonEntity } from './dossier-personne-saison.entity';
import { ExigenceDossierController } from './exigence-dossier.controller';
import { ExigenceDossierEntity } from './exigence-dossier.entity';
import { ExigenceDossierPorteeEntity } from './exigence-dossier-portee.entity';
import { ReponseExigenceDossierEntity } from './reponse-exigence-dossier.entity';
import { ExigenceDossierService } from './exigence-dossier.service';
import { PreuveMedicaleController } from './preuve-medicale.controller';
import { PreuveMedicaleEntity } from './preuve-medicale.entity';
import { PreuveMedicaleService } from './preuve-medicale.service';
import { SouscriptionDossierService } from './souscription-dossier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExigenceDossierEntity,
      ExigenceDossierPorteeEntity,
      ReponseExigenceDossierEntity,
      PreuveMedicaleEntity,
      DossierPersonneSaisonEntity,
      PersonneEntity,
      Contact,
      DocumentEntity,
      SaisonEntity,
      GroupesEntity,
      TarifInscriptionEntity,
      SouscriptionEntity,
      SouscriptionPersonneEntity,
      SouscriptionPersonneGroupeEntity,
      InscriptionSaisonEntity,
      LienGroupeEntity,
    ]),
  ],
  controllers: [
    ExigenceDossierController,
    DossierPersonneController,
    PreuveMedicaleController,
  ],
  providers: [
    ExigenceDossierService,
    PreuveMedicaleService,
    SouscriptionDossierService,
  ],
  exports: [
    ExigenceDossierService,
    PreuveMedicaleService,
    SouscriptionDossierService,
    TypeOrmModule,
  ],
})
export class ExigenceDossierModule {}
