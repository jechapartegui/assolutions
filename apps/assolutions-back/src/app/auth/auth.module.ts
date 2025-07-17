import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from '../project/project.service';
import { AccountService } from '../../crud/account.service';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // ✅ indispensable
  ],
  providers: [AuthService, ProjectService, AccountService, RegistrationSeasonService, ProfessorContractService],
  controllers: [AuthController],
})
export class AuthModule {}
