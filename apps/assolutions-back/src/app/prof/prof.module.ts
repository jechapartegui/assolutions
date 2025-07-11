import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfController } from './prof.controller';
import { ProfService } from './prof.services';
import { ProfessorService } from '../../crud/professor.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([    ]),
  ],
  providers: [ProfService, ProfessorService, ProfessorContractService, SessionProfessorService],
  controllers: [ProfController],
  exports: [ProfService], // 👈 ajoute ça
})
export class ProfModule {}
