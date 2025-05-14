import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfController } from './prof.controller';
import { ProfService } from './prof.services';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { Professeur } from '../bdd/professeur';
import { Adherent } from '../bdd/riders';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ProfesseurSaison, SeanceProfesseur,Professeur, Adherent
    ]),
  ],
  providers: [ProfService],
  controllers: [ProfController],
  exports: [ProfService], // 👈 ajoute ça
})
export class ProfModule {}
