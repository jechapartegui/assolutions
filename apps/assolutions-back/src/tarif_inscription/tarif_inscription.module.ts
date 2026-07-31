import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { GroupeTarifInscriptionEntity } from './groupe_tarif_inscription.entity';
import { TarifInscriptionController } from './tarif_inscription.controller';
import { TarifInscriptionEntity } from './tarif_inscription.entity';
import { TarifInscriptionService } from './tarif_inscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TarifInscriptionEntity,
      GroupeTarifInscriptionEntity,
      GroupesEntity,
      SaisonEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [TarifInscriptionController],
  providers: [TarifInscriptionService],
  exports: [TarifInscriptionService],
})
export class TarifInscriptionModule {}
