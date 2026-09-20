import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { MessageModule } from '../message/message.module';

import { MailProjectController } from './mail_project.controller';
import { MailProjectEntity } from './mail_project.entity';
import { MailProjectService } from './mail_project.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MailProjectEntity]),
    AccessControlModule,
    MessageModule,
  ],
  controllers: [MailProjectController],
  providers: [MailProjectService],
  exports: [MailProjectService],
})
export class MailProjectModule {}