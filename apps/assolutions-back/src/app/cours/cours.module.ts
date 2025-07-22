import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursService } from './cours.services';
import { CoursController } from './cours.controller';
import { CourseService } from '../../crud/course.service';
import { Course } from '../../entities/cours.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Course, LinkGroup
    ]),
  ],
  providers: [CoursService, CourseService, LinkGroupService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
