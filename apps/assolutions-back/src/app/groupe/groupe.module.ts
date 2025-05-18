import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupeService } from "./groupe.service";
import { Compte } from "../bdd/compte";
import { Cours } from "../bdd/cours";
import { GestionnaireProjet } from "../bdd/gestionnaire_projet";
import { Groupe } from "../bdd/groupe";
import { InscriptionSaison } from "../bdd/inscription-saison";
import { InscriptionSeance } from "../bdd/inscription-seance";
import { LienGroupe } from "../bdd/lien-groupe";
import { Lieu } from "../bdd/lieu";
import { AdherentProjet } from "../bdd/member_project";
import { ProfesseurSaison } from "../bdd/prof-saison";
import { Professeur } from "../bdd/professeur";
import { Projet } from "../bdd/project";
import { ProjetLogin } from "../bdd/project_login";
import { Adherent } from "../bdd/riders";
import { Saison } from "../bdd/saison";
import { Seance } from "../bdd/seance";
import { SeanceProfesseur } from "../bdd/seance_professeur";
import { GroupeController } from "./groupe.controller";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
InscriptionSeance, Adherent, Seance, SeanceProfesseur, LienGroupe, Compte, Cours, GestionnaireProjet, InscriptionSaison, Lieu, AdherentProjet, 
        ProfesseurSaison, Professeur, Projet, ProjetLogin, Saison, Groupe
    ]),
  ],
  providers: [GroupeService],
  controllers: [GroupeController],
  exports: [GroupeService], // 👈 ajoute ça
})
export class GroupeModule {}
