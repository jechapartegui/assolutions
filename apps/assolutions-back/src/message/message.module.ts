import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ProjectEntity } from '../project/project.entity';
import { MailRecordEntity } from '../mail_record/mail_record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MailRecordEntity, ProjectEntity]),
    AccessControlModule,
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}