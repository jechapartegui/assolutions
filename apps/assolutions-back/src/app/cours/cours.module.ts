import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
import { Professeur } from '../bdd/professeur';
import { Cours } from '../bdd/cours';
import { Lieu } from '../bdd/lieu';
import { Groupe } from '../bdd/groupe';
import { CoursService } from './cours.services';
import { CoursController } from './cours.controller';
import { CoursProfesseur } from '../bdd/cours_professeur';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
 LienGroupe,  Cours,  Lieu,  
         Professeur,   Groupe, CoursProfesseur  
    ]),
  ],
  providers: [CoursService],
  controllers: [CoursController], // 👈 ajoute ça
  exports: [CoursService], // 👈 ajoute ça
})
export class CoursModule {}
