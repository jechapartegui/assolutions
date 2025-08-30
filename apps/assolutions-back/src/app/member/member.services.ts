import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdherentSeance_VM, MesSeances_VM } from '@shared/lib/seance.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Person } from '../../entities/personne.entity';
import { Personne_VM, PersonneLight_VM } from '@shared/lib/personne.interface';
import { PersonService } from '../../crud/person.service';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { to_InscriptionSeances_VM } from '../inscription_seance/inscription_seance.services';
import { toInscriptionSaison_VM } from '../inscription_saison/inscription_saison.services';
import { SeasonService } from '../../crud/season.service';
import { SeanceService, to_Seance_VM } from '../seance/seance.services';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { AccountService } from '../../crud/account.service';
import { LinkGroupService } from '../../crud/linkgroup.service';

@Injectable()
export class MemberService {
  constructor(private seanceService:SeanceService,  
    private personserivce:PersonService,
    private accountserv:AccountService,
     private profcontratserv:ProfessorContractService, 
     private inscriptionsaisonservice:RegistrationSeasonService, 
     private inscriptionseanceservice:RegistrationSessionService, 
     private saison_serv:SeasonService,
     private linkgroup_serv: LinkGroupService
  ) {}

  async GetAll(saison_id: number): Promise<Adherent_VM[]> {
    const saison = await this.personserivce.getAllSaison(saison_id);
    if (!saison) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
    return saison.map(x => toAdherent_VM(x, x.inscriptions?? [], [])).sort((a, b) => a.nom.localeCompare(b.nom));
  }
  async GetAllEver(compte_id: number): Promise<Personne_VM[]> {
    const saison = await this.personserivce.getAllCompte(compte_id);
    if (!saison) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
    return saison.map(x => toPersonne_VM(x));
  }
  async GetMyInfo(id: number, project_id: number) {
    const saison_active = (await this.saison_serv.getActive(project_id)).id;
    const pAdh = await this.personserivce.get(id);
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    const iseason = await this.inscriptionsaisonservice.getPersonRegistrations(id, project_id);
    const iseance = await this.inscriptionseanceservice.getAllRiderSaison(id, saison_active);
    return toAdherent_VM(pAdh, iseason, iseance);
  }

  async GetMySeance(compte: number, project_id: number): Promise<AdherentSeance_VM[]> {
    const saison_active = (await this.saison_serv.getActive(project_id)).id
  
    if (!saison_active) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
    const adhrents_saison = await this.GetAdherentProject(compte, saison_active);
    
    const essai_persons = await this.EssaiProjet(compte, saison_active);
    const retour: AdherentSeance_VM[] = [];
  
    for (const ad of adhrents_saison) {
      const age = this.calculateAge(ad.date_naissance);
      const groupe = ad.inscriptionsSaison[0].groupes.map(x => x.id);
      const mes_seances = await this.seanceService.MySeance(
        ad.id,
        age,
        saison_active,
        groupe
      );
      const adherentSeance: AdherentSeance_VM = {
       
        mes_seances: mes_seances,
        personne : ad
      };
  
      retour.push(adherentSeance);
    }
    for(const es of essai_persons) {
      if(!retour.find(x => x.personne.id === es.personne.id)) {

        retour.push(es);
      }
    }
    
  
    return retour;
  }
  async GetMyProf(compte: number, project_id: number): Promise<AdherentSeance_VM[]> {
    const temp_adh = await this.personserivce.getAllCompte(compte);
  
    const saison_active = (await this.saison_serv.getActive(project_id)).id
  
    if (!saison_active) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
  
    const profs = await this.ProfSaison(temp_adh, saison_active);
    if (!profs || profs.length === 0) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
  
    const retour: AdherentSeance_VM[] = [];
  
    for (const ad of profs) {
      const mes_seances = await this.seanceService.MySeanceProf(
        ad.id,
        saison_active
      );
      const profSeance: AdherentSeance_VM = {
       personne : ad,
        mes_seances: mes_seances
      };
  
      retour.push(profSeance);
    }    
    return retour;
  }

  async GetAdherentProject(
  compte: number,
  saison_id: number
): Promise<Adherent_VM[]> {
  const liste: Adherent_VM[] = [];
  const _ads = await this.accountserv.adherentCompte(compte);

  for (const ad of _ads) {
    const iss = ad.inscriptions?.find(x => x.saisonId === saison_id);

    if (!iss) continue;
        iss.groups = await this.linkgroup_serv.getGroupsForObject('rider', iss.id);
      
    // On appelle toAdherent_VM sans le cacher dans un catch vide
    try {
      liste.push(toAdherent_VM(ad, [iss], []));
    } catch (err) {
      console.error(
        `Erreur de transformation for person=${ad.id}, inscription=${iss.id}:`,
        err
      );
    }
  }

  if (liste.length === 0) {
    return [];
  }

  return liste;
}

async EssaiProjet(
  compte: number,
  saison_id: number
): Promise<AdherentSeance_VM[]> {
  let liste: AdherentSeance_VM[] = [];
  const perso = await this.personserivce.getEssai(compte, saison_id);
  for (const p of await perso) {
    let ms = [];
    p.inscriptionsSeance.forEach(async (ie) => {
      let ma_se : MesSeances_VM = { 
        seance : to_Seance_VM(ie.seance),
        statutInscription : ie.statutInscription,
        statutPrésence : ie.statutSeance,
        inscription_id : ie.id
      }
      ms.push(ma_se);
    });
    const item: AdherentSeance_VM = {
      personne: toPersonne_VM(p),
      mes_seances:ms,
    };
    liste.push(item);    
  }
  return liste;
}


 
//fonction interne
  async AdherentSaisons(
    saison_id: number
  ): Promise<Adherent_VM[]> {

    return (await this.inscriptionsaisonservice.getAllSeason(saison_id)).map(x => toAdherent_VM(x.person, [x], []));
  }

  async ProfSaison(adherents: Person[], saison_id: number) : Promise<Personne_VM[]> {
    const liste_adherent: Personne_VM[] = [];
      const prof_proj = (await this.profcontratserv.getAllSaison(saison_id)).map(x => x.professorId);

    for (const ad of adherents) {

      if (prof_proj.includes(ad.id)) {
        liste_adherent.push(toPersonne_VM(ad));
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

  async Get(id: number, project_id:number): Promise<Adherent_VM> {
     const pAdh = await this.personserivce.get(id);
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    const PersonneVM =  toPersonne_VM(pAdh);
    const registrations = await this.inscriptionsaisonservice.getPersonRegistrations(PersonneVM.id, project_id);
    const adh :Adherent_VM = Object.assign(new Adherent_VM(), PersonneVM);
    if(registrations){
      adh.inscriptionsSaison = registrations.map((t)=> toInscriptionSaison_VM(t));
 if(registrations.find(x => x.saison.isActive)){
      adh.inscrit = true;
      adh.inscriptionsSeance = (await this.inscriptionseanceservice.getAllRiderSaison(PersonneVM.id,registrations.find(x => x.saison.isActive)!.id )).map((r) => to_InscriptionSeances_VM(r));
    }
    }
   
    return adh;
    
  }


  
   async Add(personne: Personne_VM) {
      if (!personne) {
           throw new BadRequestException('INVALID_PERSON');
         }
         const objet_base = toPerson(personne);
       
         const objet_insere = await this.personserivce.create(objet_base);
         return objet_insere.id;
  }
  async Update(personne: Personne_VM) {
     if (!personne) {
           throw new BadRequestException('INVALID_PERSON');
         }
 const objet_base = toPerson(personne);
       
         return await this.personserivce.update(objet_base.id, objet_base);
  }
  
  async Delete(id: number) {
     try{
      await this.personserivce.delete(id);
      return true;
       } catch{
        return false;
       }
  }
}

export function toPersonneLight_VM(obj: Person): PersonneLight_VM {
 const adh = new PersonneLight_VM();
  adh.id = obj.id;
  adh.nom = obj.lastName;
  adh.prenom = obj.firstName;
  adh.surnom = obj.nickname || '';
  adh.date_naissance = obj.birthDate;
  adh.sexe = obj.gender;
  return adh;
}
export function toPersonne_VM(entity: Person): Personne_VM {
 const vm = new Personne_VM();
  vm.id = entity.id;
  vm.nom = entity.lastName;
  vm.prenom = entity.firstName;
  vm.surnom = entity.nickname || '';
  vm.date_naissance = entity.birthDate;
  vm.sexe = entity.gender;
  vm.adresse = JSON.parse(entity.address);
  vm.compte = entity.accountId;
  vm.contact_prevenir = entity.emergencyContacts?? [];
  vm.contact = entity.contacts?? [];
 if(entity.account) {
    vm.login = entity.account.login?? '';
  } else  {
    vm.login = '';
    }
  return vm;
}

export function toPerson(vm:Personne_VM){
  const entity = new Person();
  entity.id = vm.id;
  entity.nickname = vm.surnom;
  entity.lastName = vm.nom;
  entity.firstName = vm.prenom;
  entity.birthDate = new Date(vm.date_naissance);
  entity.accountId = vm.compte;
  entity.address = JSON.stringify(vm.adresse);
  entity.contacts = vm.contact;
  entity.emergencyContacts = vm.contact_prevenir;
  entity.gender = vm.sexe;
  
  return entity;
}

export function toAdherent_VM(pentity:Person, ise:RegistrationSeason[], isa:RegistrationSession[]){
  const vm = new Adherent_VM();
    vm.id = pentity.id;
  vm.nom = pentity.lastName;
  vm.prenom = pentity.firstName;
  vm.surnom = pentity.nickname || '';
  vm.date_naissance = new Date(pentity.birthDate);
  vm.sexe = pentity.gender;
  vm.adresse = JSON.parse(pentity.address);
  vm.compte = pentity.accountId;
  vm.contact_prevenir = pentity.emergencyContacts?? [];
  vm.contact = pentity.contacts?? [];
  if(pentity.account) {
  vm.login = pentity.account.login?? '';
  } else  {
    vm.login = '';
  }
    
  vm.inscriptionsSaison = ise.map(x => toInscriptionSaison_VM(x));  
  vm.inscriptionsSeance = isa.map(x => to_InscriptionSeances_VM(x));
  return vm;
}