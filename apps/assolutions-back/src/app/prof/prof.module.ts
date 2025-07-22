import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfController } from './prof.controller';
import { ProfService } from './prof.services';
import { ProfessorService } from '../../crud/professor.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { AccountService } from '../../crud/account.service';
import { Professor } from '../../entities/professeur.entity';
import { ProfessorContract } from '../../entities/contrat_prof.entity';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { Account } from '../../entities/compte.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([  Professor, ProfessorContract, SessionProfessor, Account  ]),
  ],
  providers: [ProfService, ProfessorService, ProfessorContractService, SessionProfessorService, AccountService],
  controllers: [ProfController],
  exports: [ProfService], // 👈 ajoute ça
})
export class ProfModule {}
