import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerController } from './mailer.controller';
import { MailRecord } from '../../entities/mail-record.entity';
import { ProjetService } from '../project/project.service';
import { ProjectService } from '../../crud/project.service';
import { Project } from '../../entities/projet.entity';

@Module({
   imports: [
      ConfigModule,
      TypeOrmModule.forFeature([MailRecord, Project
      ]),
    ],
  providers: [MailerService, ProjetService, ProjectService ],
  controllers: [MailerController ],
  exports: [MailerService],
})
export class MailerModule {}
