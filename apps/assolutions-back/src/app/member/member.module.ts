import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MemberService } from './member.services';
import { ProjetService } from '../project/project.service';
import { SeanceService } from '../seance/seance.services';
import { ProfService } from '../prof/prof.services';
import { GroupeService } from '../groupe/groupe.service';
import { PersonService } from '../../crud/person.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { SeasonService } from '../../crud/season.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { SessionService } from '../../crud/session.service';
import { Person } from '../../entities/personne.entity';
import { Session } from '../../entities/seance.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { GroupService } from '../../crud/group.service';
import { Group } from '../../entities/groupe.entity';
import { ProfessorService } from '../../crud/professor.service';
import { Professor } from '../../entities/professeur.entity';
import { Account } from '../../entities/compte.entity';
import { AccountService } from '../../crud/account.service';
import { ProfessorContract } from '../../entities/contrat_prof.entity';
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { Season } from '../../entities/saison.entity';
import { ProjectService } from '../../crud/project.service';
import { Project } from '../../entities/projet.entity';
import { Contact } from '../../entities/contacts.entity';
import { ContactsService } from '../../crud/contacts.servivce';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
Session, Person, LinkGroup, SessionProfessor, Group, Professor, Account, ProfessorContract,
Season, RegistrationSession, RegistrationSeason, Project, Contact
    ]),
  ],
  providers: [SessionService,LinkGroupService, ContactsService,  ProjectService, ProfessorService, AccountService,  GroupService,  SessionProfessorService, MemberService, ProjetService, SeanceService, GroupeService, ProfService, PersonService, ProfessorContractService, RegistrationSessionService, RegistrationSeasonService, SeasonService],
  controllers: [MemberController],
  exports: [MemberService], // 👈 ajoute ça
})
export class MemberModule {}
