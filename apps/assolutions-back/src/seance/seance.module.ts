import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaisonEntity } from '../saison/saison.entity';
import { SeanceController } from './seance.controller';
import { SeanceEntity } from './seance.entity';
import { SeanceService } from './seance.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([SeanceEntity, SaisonEntity]), AccessControlModule],
  controllers: [SeanceController],
  providers: [SeanceService],
})
export class SeanceModule {}
