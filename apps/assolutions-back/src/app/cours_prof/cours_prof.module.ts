import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursProfService } from './cours_prof.services';
import { CoursProfController } from './cours_prof.controller';
import { CourseProfessorService } from '../../crud/courseprofessor.service';
import { CourseService } from '../../crud/course.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { CourseProfessor } from '../../entities/cours_professeur.entity';
import { Course } from '../../entities/cours.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { LinkGroup } from '../../entities/lien_groupe.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CourseProfessor, Course, ProfessorContract, CourseService, LinkGroupService, LinkGroup
    ]),
  ],
  providers: [CoursProfService, CourseProfessorService, CourseService, ProfessorContractService, LinkGroupService],
  controllers: [CoursProfController],
  exports: [CoursProfService], // 👈 ajoute ça
})
export class CoursProfModule {}
