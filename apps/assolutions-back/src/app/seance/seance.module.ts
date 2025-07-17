import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.services';
import { ProfService } from '../prof/prof.services';
import { SessionService } from '../../crud/session.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { LinkGroupService } from '../../crud/linkgroup.service';
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([    ]), // ✅ indispensable
  ],
  providers: [SeanceService, ProfService, SessionService, RegistrationSessionService, LinkGroupService],
  controllers: [SeanceController],
  exports: [SeanceService], // 👈 ajoute ça
})
export class SeanceModule {}
