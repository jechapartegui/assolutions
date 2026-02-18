import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { MailRecordController } from './mail_record.controller';
import { MailRecordEntity } from './mail_record.entity';
import { MailRecordService } from './mail_record.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([MailRecordEntity]), RegistryModule, AccessControlModule],
  controllers: [MailRecordController],
  providers: [MailRecordService],
})
export class MailRecordModule {}
