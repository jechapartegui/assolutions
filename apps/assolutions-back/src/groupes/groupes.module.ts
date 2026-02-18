import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { GroupesController } from './groupes.controller';
import { GroupesEntity } from './groupes.entity';
import { GroupesService } from './groupes.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([GroupesEntity, SaisonEntity]), RegistryModule, AccessControlModule],
  controllers: [GroupesController],
  providers: [GroupesService,SaisonService],
})
export class GroupesModule {}
