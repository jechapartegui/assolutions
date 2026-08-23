import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { SeanceProfesseurController } from './seance_professeur.controller';
import { SeanceProfesseurEntity } from './seance_professeur.entity';
import { SeanceProfesseurService } from './seance_professeur.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SeanceProfesseurEntity,
      SeanceEntity,
      SaisonEntity,
      ContratProfEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [SeanceProfesseurController],
  providers: [SeanceProfesseurService],
})
export class SeanceProfesseurModule {}
