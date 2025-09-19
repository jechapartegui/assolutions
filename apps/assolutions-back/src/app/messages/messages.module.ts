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
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { SeanceService } from '../seance/seance.services';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { SessionService } from '../../crud/session.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';

@Module({
  imports: [
    MailerModule,                                // pour appeler mailer
    TypeOrmModule.forFeature([Project, Session, Person, MailInput, MailProject, Account, RegistrationSeason, LinkGroup, SessionProfessor, RegistrationSeason, RegistrationSession, ProfessorContract]), // juste les entités lues
  ],
  providers: [MessagesService, LinkGroupService, SeanceService,SessionService, SessionProfessorService, RegistrationSessionService, ProfessorContractService],
  controllers: [MessagesController],
})
export class MessagesModule {}
