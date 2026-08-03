import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contact/contact.entity';
import { DocumentEntity } from '../document/document.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { HelloAssoModule } from '../helloasso/helloasso.module';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionEvenementEntity } from '../souscription/souscription-evenement.entity';
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
import { SouscriptionAdminService } from './souscription-admin.service';
import { SouscriptionContextEnricherService } from './souscription-context-enricher.service';
import { SouscriptionDossierService } from './souscription-dossier.service';
import { SouscriptionNotificationService } from './souscription-notification.service';
import { SouscriptionViewEnricherService } from './souscription-view-enricher.service';

@Module({
  imports: [
    HelloAssoModule,
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
      SouscriptionEvenementEntity,
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
    SouscriptionAdminService,
    SouscriptionContextEnricherService,
    SouscriptionDossierService,
    SouscriptionViewEnricherService,
    SouscriptionNotificationService,
  ],
  exports: [
    ExigenceDossierService,
    PreuveMedicaleService,
    SouscriptionAdminService,
    SouscriptionContextEnricherService,
    SouscriptionDossierService,
    SouscriptionViewEnricherService,
    SouscriptionNotificationService,
    TypeOrmModule,
  ],
})
export class ExigenceDossierModule {}
