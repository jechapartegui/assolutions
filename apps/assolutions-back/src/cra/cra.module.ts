import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { DocumentEntity } from '../document/document.entity';
import { ProfesseurEntity } from '../professeur/professeur.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';
import { MessageModule } from '../message/message.module';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceProfesseurEntity } from '../seance_professeur/seance_professeur.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CraController } from './cra.controller';
import { CraEntity, CraLigneEntity, FactureProfEntity } from './cra.entity';
import { CraService } from './cra.service';

@Module({
  imports: [MessageModule, TypeOrmModule.forFeature([CraEntity, CraLigneEntity, FactureProfEntity, ContratProfEntity, ProfesseurEntity, SaisonEntity, SeanceProfesseurEntity, SeanceEntity, DocumentEntity, PersonneEntity, CompteEntity, ProjectEntity])],
  controllers: [CraController],
  providers: [CraService],
  exports: [CraService],
})
export class CraModule {}
