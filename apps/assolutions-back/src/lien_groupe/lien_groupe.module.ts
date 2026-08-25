import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { LienGroupeController } from './lien_groupe.controller';
import { LienGroupeEntity } from './lien_groupe.entity';
import { LienGroupeService } from './lien_groupe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LienGroupeEntity, GroupesEntity, SaisonEntity]),
    AccessControlModule,
  ],
  controllers: [LienGroupeController],
  providers: [LienGroupeService],
})
export class LienGroupeModule {}
