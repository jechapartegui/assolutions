import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoursProfesseurController } from './cours_professeur.controller';
import { CoursProfesseurEntity } from './cours_professeur.entity';
import { CoursProfesseurService } from './cours_professeur.service';
import { CoursEntity } from '../cours/cours.entity';
import { CoursService } from '../cours/cours.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
@Module({
  imports: [TypeOrmModule.forFeature([CoursProfesseurEntity, CoursEntity, ContratProfEntity]), AccessControlModule],
  controllers: [CoursProfesseurController],
  providers: [CoursProfesseurService, CoursService],
})
export class CoursProfesseurModule {}
