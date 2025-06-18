import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { Compte } from './bdd/compte';
import { Adherent } from './bdd/riders';
import { AdherentProjet } from './bdd/member_project';
import { Projet } from './bdd/project';
import { APP_GUARD } from '@nestjs/core';
import { PasswordGuard } from './guards/password.guard';
import { Cours } from './bdd/cours';
import { MemberModule } from './member/member.module';
import { SeanceModule } from './seance/seance.module';
import { ProjectModule } from './project/project.module';
import { Saison } from './bdd/saison';
import { InscriptionSaison } from './bdd/inscription-saison';
import { InscriptionSeance } from './bdd/inscription-seance';
import { LienGroupe } from './bdd/lien-groupe';
import { Seance } from './bdd/seance';
import { ProjetLogin } from './bdd/project_login';
import { GestionnaireProjet } from './bdd/gestionnaire_projet';
import { ProfesseurSaison } from './bdd/prof-saison';
import { SeanceProfesseur } from './bdd/seance_professeur';
import { Lieu } from './bdd/lieu';
import { LieuModule } from './lieu/lieu.module';
import { Professeur } from './bdd/professeur';
import { ProfModule } from './prof/prof.module';
import { InscriptionSeanceModule } from './inscription_seance/inscription_seance.module';
import { SaisonModule } from './saison/saison.module';
import { Groupe } from './bdd/groupe';
import { CoursModule } from './cours/cours.module';
import { CoursProfesseur } from './bdd/cours_professeur';
import { GroupeModule } from './groupe/groupe.module';
import { Document } from './bdd/document';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost', // ou distant
      port: 3306,
      username: 'root',
      password: '',
      database: 'maseance',
      entities: [Compte, Adherent, AdherentProjet, Projet, Cours, Adherent, AdherentProjet, Projet, Saison,  CoursProfesseur, Document,
        InscriptionSaison, InscriptionSeance, LienGroupe, Seance, ProjetLogin, GestionnaireProjet, ProfesseurSaison, SeanceProfesseur, Lieu, Professeur, Groupe],
      synchronize: false, // true uniquement si tu veux que TypeORM crée/modifie les tables tout seul
    }),
    AuthModule, MemberModule, SeanceModule, ProjectModule, LieuModule, ProfModule, InscriptionSeanceModule, SaisonModule, CoursModule, GroupeModule, DocumentModule
  ],  providers: [
    {
      provide: APP_GUARD,
      useClass: PasswordGuard,
    },
  ],
})
export class AppModule {}
