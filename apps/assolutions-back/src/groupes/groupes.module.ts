import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';
import { GroupesController } from './groupes.controller';
import { GroupesEntity } from './groupes.entity';
import { GroupesService } from './groupes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupesEntity, SaisonEntity]),
    AccessControlModule,
  ],
  controllers: [GroupesController],
  providers: [GroupesService, SaisonService],
})
export class GroupesModule {}
