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

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Course, LinkGroup, Session
    ]),
  ],
  providers: [CoursService, CourseService, LinkGroupService, SessionService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
