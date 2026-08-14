import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { Contact } from '../contact/contact.entity';
import { ExigenceDossierModule } from '../exigence-dossier/exigence-dossier.module';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { HelloAssoModule } from '../helloasso/helloasso.module';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { OperationEntity } from '../operation/operation.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { GroupeTarifInscriptionEntity } from '../tarif_inscription/groupe_tarif_inscription.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { CodePromoController } from './code-promo.controller';
import { CodePromoEntity } from './code-promo.entity';
import { CodePromoService } from './code-promo.service';
import { CodePromoTarifEntity } from './code-promo-tarif.entity';
import { SouscriptionConfirmationService } from './souscription-confirmation.service';
import { SouscriptionController } from './souscription.controller';
import { SouscriptionEntity } from './souscription.entity';
import { SouscriptionEvenementEntity } from './souscription-evenement.entity';
import { SouscriptionFinanceService } from './souscription-finance.service';
import { SouscriptionPersonneEntity } from './souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from './souscription-personne-groupe.entity';
import { SouscriptionService } from './souscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SouscriptionEntity,
      SouscriptionPersonneEntity,
      SouscriptionPersonneGroupeEntity,
      SouscriptionEvenementEntity,
      CodePromoEntity,
      CodePromoTarifEntity,
      PersonneEntity,
      CompteEntity,
      Contact,
      SaisonEntity,
      GroupesEntity,
      TarifInscriptionEntity,
      GroupeTarifInscriptionEntity,
      InscriptionSaisonEntity,
      LienGroupeEntity,
      FluxFinancierEntity,
      OperationEntity,
    ]),
    HelloAssoModule,
    ExigenceDossierModule,
  ],
  controllers: [SouscriptionController, CodePromoController],
  providers: [
    SouscriptionService,
    SouscriptionConfirmationService,
    SouscriptionFinanceService,
    CodePromoService,
  ],
})
export class SouscriptionModule {}
