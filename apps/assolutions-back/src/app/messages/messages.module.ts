// messages/messages.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.services';
import { MessagesController } from './messages.controller';
import { MailerModule } from '../mail/mailer.module';
import { Project } from '../../entities/projet.entity';
import { Session } from '../../entities/seance.entity';
import { Person } from '../../entities/personne.entity';
import { MailInput } from '@shared/lib/mail-input.interface';
import { MailProject } from '../../entities/mail-project.entity';
import { Account } from '../../entities/compte.entity';

@Module({
  imports: [
    MailerModule,                                // pour appeler mailer
    TypeOrmModule.forFeature([Project, Session, Person, MailInput, MailProject, Account]), // juste les entités lues
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
