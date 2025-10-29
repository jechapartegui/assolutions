import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursService } from './cours.services';
import { CoursController } from './cours.controller';
import { CourseService } from '../../crud/course.service';
import { Course } from '../../entities/cours.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { Session } from '../../entities/seance.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { SessionService } from '../../crud/session.service';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { CourseProfessorService } from '../../crud/courseprofessor.service';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { CourseProfessor } from '../../entities/cours_professeur.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Course, LinkGroup, Session, SessionProfessor, CourseProfessor, ProfessorContract
    ]),
  ],
  providers: [CoursService, CourseService, LinkGroupService, SessionService, SessionProfessorService, CourseProfessorService, ProfessorContractService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
