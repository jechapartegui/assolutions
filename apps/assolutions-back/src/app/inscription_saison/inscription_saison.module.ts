import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { InscriptionSaisonService } from './inscription_saison.services';
import { InscriptionSaisonController } from './inscription_saison.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ]),
  ],
  providers: [RegistrationSeasonService, InscriptionSaisonService],
  controllers: [InscriptionSaisonController],
  exports: [InscriptionSaisonService], // 👈 ajoute ça
})
export class InscriptionSaisonModule {}
