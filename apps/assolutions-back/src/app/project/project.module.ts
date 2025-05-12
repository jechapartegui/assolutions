import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Compte } from '../bdd/compte';
import { AdherentProjet } from '../bdd/member_project';
import { Projet } from '../bdd/project';
import { Adherent } from '../bdd/riders';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { Saison } from '../bdd/saison';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet, InscriptionSaison, Saison]), // ✅ indispensable
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService], // 👈 ajoute ça
})
export class ProjectModule {}
