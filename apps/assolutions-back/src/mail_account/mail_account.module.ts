import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { MailAccountController } from './mail_account.controller';
import { MailAccountEntity } from './mail_account.entity';
import { MailAccountService } from './mail_account.service';

@Module({
  imports: [TypeOrmModule.forFeature([MailAccountEntity]), RegistryModule],
  controllers: [MailAccountController],
  providers: [MailAccountService],
})
export class MailAccountModule {}
