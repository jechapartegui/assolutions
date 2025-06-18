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
import { adherent, ItemContact } from '@shared/compte/src/lib/member.interface';
import { ItemList, KeyValuePair } from '@shared/compte/src';
import { LienGroupe } from '../bdd/lien-groupe';
import { Compte } from '../bdd/compte';

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
    return this.toadh(pAdh);
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
      return this.toadh(plieu);
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

  toadh(pAdh:Adherent, login:string = "", _inscrit:boolean=true, _groupes:KeyValuePair[] = []) : adherent{
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
const adresse = adre?.Street || "";
const code_postal = adre?.PostCode || "";
const ville = adre?.City || "";

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
      contact_prevenir:contacts_prevenir,
      login:login,
      groupes:_groupes,
      inscrit:_inscrit,

    }
    return AD;
  }

  async Get(id: number) {
    const pAdh= await this.adherentRepo.findOne({ where: { id } });
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.toadh(pAdh);

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
      .map(x => ({
        key: x.groupe_id,
        value: liste_groupe.find(y => y.key === x.groupe_id)?.value || ''
      }));
      adh.inscrit = inscr_saison.find(x => x.rider_id == adh.id)?true:false;
      adh.login = comptes.find(x => x.id === adh.compte)?.login || '';
    return adh;
  });
}

async GetAllAdherent(saison_id: number, project_id: number) {
  const adhs = await this.GetAll(saison_id, project_id);
  return adhs.filter(x => x.inscrit);
}
  
async  toAdh(pAdh: adherent, project_id:number): Promise<Adherent> {
  const adhbase = await this.adherentRepo.findOne({
    where: { id : pAdh.id },
  });
   const adresseObj = {
    name: pAdh.adresse,        // Le nom de l'adresse
    postcode: pAdh.code_postal, // Le code postal
    city: pAdh.ville           // La ville
  };

  // Sérialisation de l'adresse sous forme de chaîne JSON
  const const_adresse = JSON.stringify(adresseObj);

  // Crée un objet pour l'adresse
const A:Adherent ={
id:pAdh.id,
nom:pAdh.nom,
prenom:pAdh.prenom,
date_creation:adhbase?adhbase.date_creation:new Date(),
adresse: const_adresse,
sexe:pAdh.sexe,
compte:pAdh.compte,
contacts:JSON.stringify(pAdh.contact),
contacts_prevenir:JSON.stringify(pAdh.contact_prevenir),
project_id:project_id,
surnom:pAdh.surnom,
est_prof:false,
date_naissance:pAdh.date_naissance
}

  return A;
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

  
    async Add(s: adherent, project_id :number) : Promise<number> {
    if (!s) {
      throw new BadRequestException('INVALID_MEMBER');
    }
    const objet_base = await this.toAdh(s, project_id);
  
    const newISS = await this.adherentRepo.create(objet_base);
    const saved = await this.adherentRepo.save(newISS);
    return saved.id;
  }
  async Update(s: adherent, project_id :number) {
    if (!s) {
      throw new BadRequestException('INVALID_MEMBER');
    }
     const objet_base = this.toAdh(s, project_id);
  
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
