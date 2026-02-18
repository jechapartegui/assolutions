import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { SeanceProfesseurController } from './seance_professeur.controller';
import { SeanceProfesseurEntity } from './seance_professeur.entity';
import { SeanceProfesseurService } from './seance_professeur.service';
import { SeanceEntity } from '../seance/seance.entity';
import { SeanceService } from '../seance/seance.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SaisonService } from '../saison/saison.service';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { ContratProfService } from '../contrat_prof/contrat_prof.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([SeanceProfesseurEntity, SeanceEntity, SaisonEntity, ContratProfEntity]), RegistryModule, AccessControlModule],
  controllers: [SeanceProfesseurController],
  providers: [SeanceProfesseurService, SeanceService, SaisonService, ContratProfService],
})
export class SeanceProfesseurModule {}
