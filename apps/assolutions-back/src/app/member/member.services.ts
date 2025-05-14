import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Adherent } from '../bdd/riders';
import { AdherentProjet } from '../bdd/member_project';
import { ProjectService } from '../project/project.service';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { SeanceService } from '../seance/seance.services';
import { GroupeService } from '../groupe/groupe.service';
import { AdherentSeance } from '@shared/compte/src/lib/seance.interface';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { adherent, ItemContact } from '@shared/compte/src/lib/member.interface';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(InscriptionSaison)
    private readonly inscriptionsaisonRepo: Repository<InscriptionSaison>,
    @InjectRepository(Adherent)
    private readonly adherentRepo: Repository<Adherent>,
    @InjectRepository(AdherentProjet)
    private readonly adherentProjetRepo: Repository<AdherentProjet>,
    @InjectRepository(ProfesseurSaison)
    private readonly ProfesseurSaisonRepo: Repository<ProfesseurSaison>,
    @InjectRepository(GestionnaireProjet)
    private readonly GestionnaireProjetRepo: Repository<GestionnaireProjet>,
    private projectService: ProjectService,
    private seanceService: SeanceService,
    private groupeservice: GroupeService
  ) {}
  async GetMyInfo(id: number) {
    const pAdh = await this.adherentRepo.findOne({ where: { id } });
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    return this.toAdh(pAdh);
  }
  async GetGestionnaire(compte: number, project_id: number): Promise<boolean> {
    const temp_adh = await this.GetAdherentProject(compte, project_id);
    const gestionnaire = await this.Gestionnaire(temp_adh, project_id);
    if(gestionnaire && gestionnaire.length > 0) {
      return true;
    }
    return false;
  }
  async GetMySeance(compte: number, project_id: number): Promise<AdherentSeance[]> {
    const temp_adh = await this.GetAdherentProject(compte, project_id);
  
    const saison_active = await this.projectService.getActiveSaion(project_id);
    if (!saison_active) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
  
    const adhrents = await this.AdherentSaisons(temp_adh, saison_active.id);
    if (!adhrents || adhrents.length === 0 ) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
  
    const retour: AdherentSeance[] = [];
  
    for (const ad of adhrents) {
      const age = this.calculateAge(ad.date_naissance);
      const groupe = await this.groupeservice.getGroupe(ad.id, 'rider');
      const mes_seances = await this.seanceService.MySeance(
        ad.id,
        age,
        saison_active.id,
        groupe.map((x) => x.groupe_id),
        saison_active.date_debut,
        saison_active.date_fin
      );
      const adherentSeance: AdherentSeance = {
        id: ad.id,
        nom: ad.nom,
        prenom: ad.prenom,
        surnom: ad.surnom,
        dateNaissance: ad.date_naissance,
        age: age,
        mes_seances: mes_seances,
        sexe: ad.sexe,
      };
  
      retour.push(adherentSeance);
    }


    
  
    return retour;
  }
  async GetMyProf(compte: number, project_id: number): Promise<AdherentSeance[]> {
    const temp_adh = await this.GetAdherentProject(compte, project_id);
  
    const saison_active = await this.projectService.getActiveSaion(project_id);
    if (!saison_active) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
  
    const profs = await this.ProfSaison(temp_adh, saison_active.id);
    if (!profs || profs.length === 0) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
  
    const retour: AdherentSeance[] = [];
  
    for (const ad of profs) {
      const age = this.calculateAge(ad.date_naissance);
      const mes_seances = await this.seanceService.MySeanceProf(
        ad.id,
        saison_active.id,
        saison_active.date_debut,
        saison_active.date_fin
      );
      const profSeance: AdherentSeance = {
        id: ad.id,
        nom: ad.nom,
        prenom: ad.prenom,
        surnom: ad.surnom,
        dateNaissance: ad.date_naissance,
        age: age,
        mes_seances: mes_seances,
        sexe: ad.sexe,
      };
  
      retour.push(profSeance);
    }


    
  
    return retour;
  }

  async GetAdherentProject(
    compte: number,
    project_id: number
  ): Promise<Adherent[]> {
    const liste_adherent: Adherent[] = [];

    const _adherents = await this.adherentRepo.find({ where: { compte: compte } });

    if (!_adherents || _adherents.length === 0) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }

    for (const ad of _adherents) {
      const adherentProject = await this.adherentProjetRepo.findOne({
        where: { member_id: ad.id, project_id },
      });

      if (adherentProject) {
        liste_adherent.push(ad);
      }
    }

    if (liste_adherent.length === 0) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }

    return liste_adherent;
  }

 
//fonction interne
  async AdherentSaisons(
    adherents: Adherent[],
    saison_id: number
  ): Promise<adherent[]> {
    const liste_adherent: Adherent[] = [];

    for (const ad of adherents) {
      const adherentProject = await this.inscriptionsaisonRepo.findOne({
        where: { rider_id: ad.id, saison_id },
      });

      if (adherentProject) {
        liste_adherent.push(ad);
      }
    }

    if (liste_adherent.length === 0) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }

    return liste_adherent.map((plieu) => {
      return this.toAdh(plieu);
    });
  }

  async ProfSaison(adherents: Adherent[], saison_id: number) {
    const liste_adherent: Adherent[] = [];

    for (const ad of adherents) {
      const adherentProject = await this.ProfesseurSaisonRepo.findOne({
        where: { rider_id: ad.id, saison_id },
      });

      if (adherentProject) {
        liste_adherent.push(ad);
      }
    }

    return liste_adherent;
  }

  async Gestionnaire(adherents: Adherent[], project_id: number) {

    const liste_adherent: Adherent[] = [];

    for (const ad of adherents) {
      const adherentProject = await this.GestionnaireProjetRepo.findOne({
        where: { rider_id: ad.id, project_id },
      });

      if (adherentProject) {
        liste_adherent.push(ad);
      }
    }

    return liste_adherent;
  }

  calculateAge(dateNaissance?: Date | string): number {
    const today = new Date();

    let birthDate: Date;

    if (!dateNaissance) {
      birthDate = today; // Pas de date fournie => utiliser aujourd'hui
    } else {
      birthDate = new Date(dateNaissance); // Convertir string ou Date en Date
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--; // Anniversaire pas encore passé cette année
    }

    return age;
  }

  toAdh(pAdh:Adherent) : adherent{
 let adre: any = null;
let cont: any = null;
let cont_prev: any = null;

try {
  adre = pAdh.adresse && pAdh.adresse.length > 2 ? JSON.parse(pAdh.adresse) : null;
} catch (e) {
  adre = null;
}

try {
  cont = pAdh.contacts && pAdh.contacts.length > 2 ? JSON.parse(pAdh.contacts) : null;
} catch (e) {
  cont = null;
}
try {
  cont_prev = pAdh.contacts_prevenir && pAdh.contacts_prevenir.length > 2 ? JSON.parse(pAdh.contacts_prevenir) : null;
} catch (e) {
  cont_prev = null;
}


// Valeurs par défaut si `adre` ou `cont` sont invalides
const adresse = adre?.name || "";
const code_postal = adre?.postcode || "";
const ville = adre?.city || "";

const contacts: ItemContact[] = Array.isArray(cont) ? cont : [];
const contacts_prevenir: ItemContact[] = Array.isArray(cont_prev) ? cont_prev : [];

    let AD:adherent = {
      id:pAdh.id,
      nom:pAdh.nom,
      prenom:pAdh.prenom,
      surnom:pAdh.surnom,
      date_naissance:pAdh.date_naissance,
      adresse: adresse,
      ville:ville,
      code_postal:code_postal,
      sexe:pAdh.sexe,
      compte:pAdh.compte,
      contact: contacts,
      contact_prevenir:contacts_prevenir

    }
    return AD;
  }
}
