import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LienGroupeController } from './lien_groupe.controller';
import { LienGroupeEntity } from './lien_groupe.entity';
import { LienGroupeService } from './lien_groupe.service';
import { GroupesEntity } from '../groupes/groupes.entity';
import { GroupesService } from '../groupes/groupes.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([LienGroupeEntity, GroupesEntity, SaisonEntity]), AccessControlModule],
  controllers: [LienGroupeController],
  providers: [LienGroupeService, GroupesService, SaisonService],
})
export class LienGroupeModule {}
