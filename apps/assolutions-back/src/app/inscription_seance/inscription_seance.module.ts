import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscriptionSeanceService } from './inscription_seance.services';
import { InscriptionSeanceController } from './inscription_seance.controller';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ]),
  ],
  providers: [RegistrationSessionService, InscriptionSeanceService],
  controllers: [InscriptionSeanceController],
  exports: [InscriptionSeanceService], // 👈 ajoute ça
})
export class InscriptionSeanceModule {}
