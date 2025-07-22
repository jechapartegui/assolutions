import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.services';
import { ProfService } from '../prof/prof.services';
import { SessionService } from '../../crud/session.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { ProfessorService } from '../../crud/professor.service';
import { Professor } from '../../entities/professeur.entity';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { AccountService } from '../../crud/account.service';
import { Account } from '../../entities/compte.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';
import { Session } from '../../entities/seance.entity';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([  Professor, Account, ProfessorContract, Session, RegistrationSession, LinkGroup,SessionProfessor  ]), // ✅ indispensable
  ],
  providers: [SeanceService, ProfService,ProfessorService, AccountService, SessionService, RegistrationSessionService, LinkGroupService, SessionProfessorService, ProfessorContractService],
  controllers: [SeanceController],
  exports: [SeanceService], // 👈 ajoute ça
})
export class SeanceModule {}
