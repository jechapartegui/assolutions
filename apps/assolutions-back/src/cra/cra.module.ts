import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { DocumentEntity } from '../document/document.entity';
import { ProfesseurEntity } from '../professeur/professeur.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceProfesseurEntity } from '../seance_professeur/seance_professeur.entity';
import { CraController } from './cra.controller';
import { CraEntity, CraLigneEntity, FactureProfEntity } from './cra.entity';
import { CraService } from './cra.service';

@Module({
  imports: [TypeOrmModule.forFeature([CraEntity, CraLigneEntity, FactureProfEntity, ContratProfEntity, ProfesseurEntity, SaisonEntity, SeanceProfesseurEntity, DocumentEntity])],
  controllers: [CraController],
  providers: [CraService],
  exports: [CraService],
})
export class CraModule {}
