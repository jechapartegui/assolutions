import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountService } from '../../crud/account.service';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { ProfService } from '../prof/prof.services';
import { MemberService } from '../member/member.services';
import { SeasonService } from '../../crud/season.service';
import { Account } from '../../entities/compte.entity';
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { Season } from '../../entities/saison.entity';
import { SeanceService } from '../seance/seance.services';
import { PersonService } from '../../crud/person.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { ProfessorService } from '../../crud/professor.service';
import { Professor } from '../../entities/professeur.entity';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { SessionService } from '../../crud/session.service';
import { Session } from '../../entities/seance.entity';
import { Person } from '../../entities/personne.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';
import { MailerService } from '../mail/mailer.service';
import { MailAccount } from '../../entities/mail-account.entity';
import { MailRecord } from '../../entities/mail-record.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Account,MailAccount,MailRecord,  RegistrationSeason, LinkGroup, Season, RegistrationSession, Professor, SessionProfessor, Session, Person,ProfessorContract]), // ✅ indispensable
  ],
  providers: [AuthService, MailerService, SessionService,ProfessorService, AccountService, RegistrationSeasonService, SessionProfessorService, RegistrationSessionService, SeasonService, MemberService, ProfService, LinkGroupService, SeanceService, PersonService, ProfessorContractService],
  controllers: [AuthController],
    exports: [AuthService], // 👈 ajoute ça
})
export class AuthModule {}
