import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InscriptionSeanceController } from './inscription_seance.controller';
import { InscriptionSeanceEntity } from './inscription_seance.entity';
import { InscriptionSeanceService } from './inscription_seance.service';
import { SeanceEntity } from '../seance/seance.entity';
import { SeanceService } from '../seance/seance.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
import { PersonneEntity } from '../personne/personne.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { CompteEntity } from '../compte/compte.entity';
@Module({
  imports: [TypeOrmModule.forFeature([InscriptionSeanceEntity, SeanceEntity, SaisonEntity, PersonneEntity, LienGroupeEntity, CompteEntity]), AccessControlModule],
  controllers: [InscriptionSeanceController],
  providers: [InscriptionSeanceService, SeanceService, SaisonService],
})
export class InscriptionSeanceModule {}
