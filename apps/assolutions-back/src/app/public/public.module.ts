import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { CoursService } from '../cours/cours.services';
import { SeanceService } from '../seance/seance.services';

// ⚠️ adapte
import { PublicPlanningService } from './public.services';
import { PublicPlanningController } from './public.controller';
import { Project } from '../../entities/projet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [PublicPlanningController],
  providers: [PublicPlanningService, CoursService, SeanceService],
})
export class PublicModule {}
