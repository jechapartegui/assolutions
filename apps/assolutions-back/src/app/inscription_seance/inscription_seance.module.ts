import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscritpionSeanceService } from './inscription_seance.services';
import { InscritpionSeanceController } from './inscription_seance.controller';
import { InscriptionSeance } from '../bdd/inscription-seance';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    InscriptionSeance    
    ]),
  ],
  providers: [InscritpionSeanceService],
  controllers: [InscritpionSeanceController],
  exports: [InscritpionSeanceService], // 👈 ajoute ça
})
export class InscritpionSeanceModule {}
