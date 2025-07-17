import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursService } from './cours.services';
import { CoursController } from './cours.controller';
import { CourseService } from '../../crud/course.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ]),
  ],
  providers: [CoursService, CourseService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
