import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { SaisonEntity } from '../saison/saison.entity';
import { InscriptionSaisonController } from './inscription_saison.controller';
import { InscriptionSaisonEntity } from './inscription_saison.entity';
import { InscriptionSaisonService } from './inscription_saison.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InscriptionSaisonEntity, SaisonEntity]),
    AccessControlModule,
  ],
  controllers: [InscriptionSaisonController],
  providers: [InscriptionSaisonService],
})
export class InscriptionSaisonModule {}
