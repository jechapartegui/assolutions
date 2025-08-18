import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailAccount } from '../../entities/mail-account.entity';
import { MailerController } from './mailer.controller';
import { MailRecord } from '../../entities/mail-record.entity';

@Module({
   imports: [
      ConfigModule,
      TypeOrmModule.forFeature([MailAccount, MailRecord
      ]),
    ],
  providers: [MailerService, ],
  controllers: [MailerController ],
  exports: [MailerService],
})
export class MailerModule {}
