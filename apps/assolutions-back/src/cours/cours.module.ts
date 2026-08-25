import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { CoursController } from './cours.controller';
import { CoursEntity } from './cours.entity';
import { CoursService } from './cours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoursEntity, ContratProfEntity, SaisonEntity]),
    AccessControlModule,
  ],
  controllers: [CoursController],
  providers: [CoursService],
})
export class CoursModule {}
