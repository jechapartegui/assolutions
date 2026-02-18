import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceController } from './seance.controller';
import { SeanceEntity } from './seance.entity';
import { SeanceService } from './seance.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([SeanceEntity, SaisonEntity]), RegistryModule, AccessControlModule],
  controllers: [SeanceController],
  providers: [SeanceService],
})
export class SeanceModule {}
