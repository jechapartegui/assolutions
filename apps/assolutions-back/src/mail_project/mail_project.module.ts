import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { MailProjectController } from './mail_project.controller';
import { MailProjectEntity } from './mail_project.entity';
import { MailProjectService } from './mail_project.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([MailProjectEntity]), RegistryModule, AccessControlModule],
  controllers: [MailProjectController],
  providers: [MailProjectService],
})
export class MailProjectModule {}
