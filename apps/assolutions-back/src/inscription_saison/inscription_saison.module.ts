import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InscriptionSaisonController } from './inscription_saison.controller';
import { InscriptionSaisonEntity } from './inscription_saison.entity';
import { InscriptionSaisonService } from './inscription_saison.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([InscriptionSaisonEntity, SaisonEntity]), AccessControlModule],
  controllers: [InscriptionSaisonController],
  providers: [InscriptionSaisonService, SaisonService],
})
export class InscriptionSaisonModule {}
