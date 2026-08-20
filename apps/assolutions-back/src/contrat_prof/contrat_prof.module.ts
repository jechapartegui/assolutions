import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { ProfesseurEntity } from '../professeur/professeur.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';
import { ContratProfController } from './contrat_prof.controller';
import { ContratProfEntity } from './contrat_prof.entity';
import { ContratProfService } from './contrat_prof.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContratProfEntity,
      SaisonEntity,
      ProfesseurEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [ContratProfController],
  providers: [ContratProfService, SaisonService],
})
export class ContratProfModule {}
