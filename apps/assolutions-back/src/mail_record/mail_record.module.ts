import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailRecordController } from './mail_record.controller';
import { MailRecordEntity } from './mail_record.entity';
import { MailRecordService } from './mail_record.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([MailRecordEntity]), AccessControlModule],
  controllers: [MailRecordController],
  providers: [MailRecordService],
})
export class MailRecordModule {}
