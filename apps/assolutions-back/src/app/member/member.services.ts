import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Adherent } from '../bdd/riders';
import { AdherentProjet } from '../bdd/member_project';
import { ProjectService } from '../project/project.service';
import { InscriptionSaison } from '../bdd/inscription-saison';
import { SeanceService } from '../seance/seance.services';
import { GroupeService } from '../groupe/groupe.service';
import { AdherentSeance } from '@shared/compte/src/lib/seance.interface';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { ItemList, KeyValuePair } from '@shared/compte/src';
import { LienGroupe } from '../bdd/lien-groupe';
import { Compte } from '../bdd/compte';
import { AdherentVM } from '@shared/compte/src/lib/member.interface';
import { LienGroupe_VM } from '@shared/compte/src/lib/groupe.interface';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(InscriptionSaison)
    private readonly inscriptionsaisonRepo: Repository<InscriptionSaison>,
    @InjectRepository(LienGroupe)
    private readonly LienGroupeRepo: Repository<LienGroupe>,
    @InjectRepository(Adherent)
    private readonly adherentRepo: Repository<Adherent>,
    @InjectRepository(AdherentProjet)
    private readonly adherentProjetRepo: Repository<AdherentProjet>,
    @InjectRepository(ProfesseurSaison)
    private readonly ProfesseurSaisonRepo: Repository<ProfesseurSaison>,
    @InjectRepository(GestionnaireProjet)
    private readonly GestionnaireProjetRepo: Repository<GestionnaireProjet>,
    @InjectRepository(Compte)
    private readonly CompteRepo: Repository<Compte>,
    private projectService: ProjectService,
    private seanceService: SeanceService,
    private groupeservice: GroupeService
  ) {}
  async GetMyInfo(id: number) {
    const pAdh = await this.adherentRepo.findOne({ where: { id } });
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    return toAdherentVM(pAdh);
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
      const groupe = await this.groupeservice.getGroupeObjet(ad.id, 'rider');
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
  ): Promise<AdherentVM[]> {
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
      return toAdherentVM(plieu);
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

  async Get(id: number) {
    const pAdh= await this.adherentRepo.findOne({ where: { id } });
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return toAdherentVM(pAdh);

  }
 async GetAll(saison_id: number, project_id: number) {
  const adherentProject = await this.adherentProjetRepo.find({
    where: { project_id },
  });

  const adhPr: Adherent[] = await this.adherentRepo.find({
    where: { id: In(adherentProject.map(x => x.member_id)) },
  });

  const liste_groupe:KeyValuePair[] = await this.groupeservice.GetAll(saison_id);

  const inscr_saison:InscriptionSaison[] = await this.inscriptionsaisonRepo.find({
    where: { rider_id: In(adherentProject.map(x => x.member_id)),
      saison_id
     },
  });
   const comptes:Compte[] = await this.CompteRepo.find({
    where: { id: In(adhPr.map(x => x.compte)),
      
     },
  });

  const group: LienGroupe[] = await this.LienGroupeRepo.find({
    where: {
      objet_id: In(adherentProject.map(x => x.member_id)),
      groupe_id: In(liste_groupe.map(x => x.key)),
      objet_type: "rider"
    },
  });

  const adhs = await this.AdherentSaisons(adhPr, saison_id);

  if (!adhs) {
    throw new UnauthorizedException('NO_USER_FOUND');
  }

return adhs.map((adh) => {
  adh.groupes = group
    .filter(x => x.objet_id === adh.id)
    .map(x => new LienGroupe_VM(
      x.groupe_id,
      liste_groupe.find(y => y.key === x.groupe_id)?.value || '',
      x.id
    ))
    .sort((a, b) => a.nom.localeCompare(b.nom));
 adh.adhesion = inscr_saison;
  adh.inscrit = inscr_saison.find(x => x.rider_id === adh.id) ? true : false;
  adh.login = comptes.find(x => x.id === adh.compte)?.login || '';

  return adh;
});

}

async GetAllAdherent(saison_id: number, project_id: number) {
  const adhs = await this.GetAll(saison_id, project_id);
  return adhs.filter(x => x.inscrit);
}
  

  
    async GetAllLight(project_id:number, saison_id:number):Promise<ItemList[]> {
     const adherentProject = await this.adherentProjetRepo.find({
    where: { project_id },
  });

  const adhPr: Adherent[] = await this.adherentRepo.find({
    where: { id: In(adherentProject.map(x => x.member_id)) },
  });



  const adhs = await this.AdherentSaisons(adhPr, saison_id);

  if (!adhs) {
    throw new UnauthorizedException('NO_USER_FOUND');
  }

  return adhs.map((adh) => {
    let kvp:ItemList = {
      id:adh.id,
      libelle:adh.prenom +  " " + adh.nom,
      objet: 'RIDER'
    }    
    return kvp;
  });
  
  
    }

  async GetAllAdherentLight(project_id: number, saison_id: number): Promise<ItemList[]> {
  const adherentProject = await this.adherentProjetRepo.find({
    where: { project_id },
  });

  const adhPr: Adherent[] = await this.adherentRepo.find({
    where: { id: In(adherentProject.map(x => x.member_id)) },
  });

  const adhs = await this.AdherentSaisons(adhPr, saison_id);

  if (!adhs) {
    throw new UnauthorizedException('NO_USER_FOUND');
  }

  const inscr_saison: InscriptionSaison[] = await this.inscriptionsaisonRepo.find({
    where: {
      rider_id: In(adherentProject.map(x => x.member_id)),
      saison_id
    },
  });

  const riderIds = inscr_saison.map(x => x.rider_id);
  const adh_insc = adhs.filter(x => riderIds.includes(x.id));

  return adh_insc.map((adh) => {
    const kvp: ItemList = {
      id: adh.id,
      libelle: `${adh.prenom} ${adh.nom}`,
      objet: 'RIDER'
    };
    return kvp;
  });
}

  
    async Add(s: AdherentVM, project_id :number) : Promise<number> {
    if (!s) {
      throw new BadRequestException('INVALID_MEMBER');
    }
    const objet_base = await toAdherentEntity(s);  
    const newISS = await this.adherentRepo.create(objet_base);
    const saved = await this.adherentRepo.save(newISS);
    const adh_project = new AdherentProjet();
    adh_project.member_id = saved.id;
    adh_project.project_id = project_id;
    await this.adherentProjetRepo.save(adh_project);
    return saved.id;
  }
  async Update(s: AdherentVM, project_id :number) {
    if (!s) {
      throw new BadRequestException('INVALID_MEMBER');
    }
     const objet_base = await toAdherentEntity(s);
  
    const existing = await this.adherentRepo.findOne({ where: { id: s.id } });
    if (!existing) {
      throw new NotFoundException('NO_MEMBER_FOUND');
    }
  
    const updated = await this.adherentRepo.save({ ...existing, ...objet_base });
    if(updated){
      return true;
    } else {
      return false;
    };
  }
  
  async Delete(id: number) {
    const toDelete = await this.adherentRepo.findOne({ where: { id } });
    if (!toDelete) {
      throw new NotFoundException('NO_MEMBER_FOUND');
    }
  
    const i = await this.adherentRepo.remove(toDelete);
   if(i){
      return true;
    } else {
      return false;
    };
  }
}
export function toAdherentEntity(obj: AdherentVM): Adherent {
  const entity = new Adherent();
  entity.id = obj.id;
  entity.nom = obj.nom;
  entity.prenom = obj.prenom;
  entity.surnom = obj.surnom;
  entity.date_naissance = obj.date_naissance;
  entity.sexe = obj.sexe;
  entity.adresse = obj.adresse ? JSON.stringify(obj.adresse) : '';
  entity.compte = obj.compte;
  entity.contacts = JSON.stringify(obj.contact);
  entity.contacts_prevenir = JSON.stringify(obj.contact_prevenir);  
  entity.date_creation = new Date();
  return entity;

}

export function toAdherentVM(obj: Adherent): AdherentVM {
  const adh = new AdherentVM();
  adh.id = obj.id;
  adh.nom = obj.nom;
  adh.prenom = obj.prenom;
  adh.surnom = obj.surnom;
  adh.date_naissance = obj.date_naissance;
  adh.sexe = obj.sexe;
  adh.adresse = JSON.parse(obj.adresse || '{}');
  adh.compte = obj.compte;
  adh.contact = JSON.parse(obj.contacts || '[]');
  adh.contact_prevenir = JSON.parse(obj.contacts_prevenir || '[]');
  return adh;
}
