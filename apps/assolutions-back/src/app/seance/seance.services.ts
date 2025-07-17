import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LienGroupe_VM } from '@shared/src/lib/groupe.interface';
import { MesSeances_VM, Seance_VM } from '@shared/src/lib/seance.interface';
import { SessionService } from '../../crud/session.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { Session } from '../../entities/seance.entity';
import { toPersonneLight_VM } from '../member/member.services';
import { LinkGroupService } from '../../crud/linkgroup.service';

@Injectable()
export class SeanceService {
  constructor(private seanceserv:SessionService, private inscriptionseance_serv:RegistrationSessionService, private liengroup_serv:LinkGroupService
  ) // @InjectRepository(Projet)
  // private readonly projetRepo: Repository<Projet>,
  {}

  async GetSeanceSaison(saison_id:number): Promise<Seance_VM[]>{
     const seances = await this.seanceserv.getAllSeason(saison_id);
        if (!seances) {
         return [];
        }
        return seances.map((seance) => {
          return to_Seance_VM(seance);
        });
  }

  async MySeance(
    adhrent_id: number,
    age: number,
    saison_id: number,
    groupe_id: number[],
  ): Promise<MesSeances_VM[]> {

    const seances = await this.GetSeanceSaison(saison_id);

    if (!seances || seances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    const filteredSeances: MesSeances_VM[] = [];

    for (const _seance of seances) {
      const maSeance: MesSeances_VM = {
        seance : _seance,
        statutPrésence : undefined,
        statutInscription : undefined,
        inscription_id :0};
       
      //check si présence signalée...
      
      const ins = await this.inscriptionseance_serv.getRiderSeance(adhrent_id, _seance.seance_id);
      if (ins) {
        maSeance.inscription_id = ins.id;
        maSeance.statutInscription = ins!.statutInscription;        
        filteredSeances.push(maSeance);
      } else {
        let ajout: boolean = true;
        // filter age
        if (_seance.est_limite_age_minimum && age < _seance.age_minimum!) {
          ajout = false;
        }
        if (_seance.est_limite_age_maximum && age > _seance.age_maximum!) {
          ajout = false;
        }

        //filter groupe
     
        if (_seance.groupes.length == 0) {
          ajout = false;
        } else {
         let gr_commun = false;
         _seance.groupes.map(x => x.id).forEach(idgs =>{
          if(groupe_id.includes(idgs)){
            gr_commun = true;
          }
         })
         if(!gr_commun){
          ajout = false;
         }
        }
        if(ajout==true) {
          filteredSeances.push(maSeance);
        }
      }
    }

    if (filteredSeances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    return filteredSeances;
  }

  async MySeanceProf(
    adhrent_id: number,
    saison_id: number
  ): Promise<MesSeances_VM[]> {
    let filteredSeances:MesSeances_VM[] = [];
    const seances = await this.seanceserv.getAllSeason(saison_id);

    if (!seances || seances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }
    seances.forEach((_session) =>{
      const idprof = _session.seanceProfesseurs.map(x => x.professeur.professorId);
      if(idprof.includes(adhrent_id)){
        const myss:MesSeances_VM ={
          seance : to_Seance_VM(_session),
          statutInscription :undefined,
          inscription_id :0,
          statutPrésence : undefined
        }
filteredSeances.push(myss);
      }

    })

   

    if (filteredSeances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    return filteredSeances;
  }

  async GetAll(saison_id: number): Promise<Seance_VM[]> {
  const seanceListe = await this.seanceserv.getAllSeason(saison_id);
  if (!seanceListe) {
    return [];
  }
  return seanceListe.map(x => to_Seance_VM(x));
  }

 async GetByDate(
  saison_id: number,
  date_debut?: string,
  date_fin?: string
): Promise<Seance_VM[]> {
  const dateDebut = date_debut ? startOfDay(new Date(date_debut)) : null;
  const dateFin = date_fin ? endOfDay(new Date(date_fin)) : null;

  if (!dateDebut && !dateFin) {
    throw new NotFoundException('NO_DATE');
  }

  if ((dateDebut && isNaN(dateDebut.getTime())) || (dateFin && isNaN(dateFin.getTime()))) {
    throw new NotFoundException('INVALID_DATE');
  }

  let seances = await this.GetAll(saison_id);

  if (dateDebut) {
    seances = seances.filter(seance => new Date(seance.date_seance) >= dateDebut);
  }

  if (dateFin) {
    seances = seances.filter(seance => new Date(seance.date_seance) <= dateFin);
  }

  return seances;
}


  async Get(id: number): Promise<Seance_VM> {
    const seance = await this.seanceserv.get(id);
    if(!seance){
         throw new UnauthorizedException('SESSION_NOT_FOUND');
    }
    return to_Seance_VM(seance);
  }
  
  async AddRange(
    seance: Seance_VM,
    date_debut_serie: Date,
    date_fin_serie: Date,
    jour_semaine: string
  ): Promise<Seance_VM[]> {
    const startDate = startOfDay(date_debut_serie);
    const endDate = endOfDay(date_fin_serie);
    const seances: Seance_VM[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.toLocaleString('fr-FR', { weekday: 'long' }) === jour_semaine) {
        const newSeance = { ...seance, date: new Date(currentDate) };
       const sss = await this.Add(newSeance);
        newSeance.seance_id = sss.id;
        newSeance.groupes.forEach(async (lig) =>{
          await this.liengroup_serv.create(lig);
        })
        seances.push(newSeance);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
return seances;
  }

 async Add(s: Seance_VM) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toSession(s);
  return this.seanceserv.create(objet_base);
}

async Update(s: Seance_VM) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toSession(s);
  return this.seanceserv.update(objet_base.id, objet_base);
}



async Delete(id: number) {
return await this.seanceserv.delete(id);
}
}





// src/utils/date.utils.ts

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function calculerHeureFin(heureDebut: string, dureeMinutes: number): string {
  const [hours, minutes] = heureDebut.split(':').map(Number);
  const debut = new Date();
  debut.setHours(hours, minutes, 0, 0);

  // Ajoute la durée
  debut.setMinutes(debut.getMinutes() + dureeMinutes);

  // Reformate en "HH:MM"
  const heure = debut.getHours().toString().padStart(2, '0');
  const minute = debut.getMinutes().toString().padStart(2, '0');

  return `${heure}:${minute}`;
}

export function to_Seance_VM(entity: Session): Seance_VM {
  const vm = new Seance_VM();

  vm.seance_id = entity.id;
  vm.saison_id = entity.seasonId;
  vm.cours = entity.courseId ?? 0;
  vm.libelle = entity.label ?? '';
  vm.type_seance = entity.type;
  vm.date_seance = new Date(entity.date?.toISOString().split('T')[0] ?? ''); // au format YYYY-MM-DD
  vm.heure_debut = entity.startTime;
  vm.duree_seance = entity.duration;
  vm.lieu_id = entity.locationId;
  vm.statut = entity.status;
  vm.age_minimum = entity.minAge ?? null;
  vm.age_maximum = entity.maxAge ?? null;
  vm.place_maximum = entity.maxPlaces ?? null;
  vm.essai_possible = entity.trialAllowed;
  vm.nb_essai_possible = entity.trialCount ?? null;
  vm.info_seance = entity.info ?? '';
  vm.convocation_nominative = entity.nominativeCall;
  vm.afficher_present = entity.showAttendance;
  vm.rdv = entity.appointment ?? '';
  vm.seanceProfesseurs = entity.seanceProfesseurs.map(x => toPersonneLight_VM(x.professeur.professor.person))  
  vm.est_limite_age_minimum = entity.limitMinAge ? true : false;
  vm.est_limite_age_maximum = entity.limitMaxAge ? true : false;
  vm.est_place_maximum = entity.limitPlaces ? true : false;
  vm.groupes= (entity.groups ?? []).map(lg =>
      new LienGroupe_VM(lg.groupId, lg.group?.name ?? '', lg.objectId)
    );
  return vm;
}


export function toSession(vm: Seance_VM): Session {
  const entity = new Session();

  entity.id = vm.seance_id ?? 0; // Assurez-vous que l'ID est défini, sinon utilisez 0
  entity.seasonId = vm.saison_id;
  entity.courseId = vm.cours ?? 0;
  entity.label = vm.libelle;
  entity.type = vm.type_seance;
  entity.date = new Date(vm.date_seance);
  entity.startTime = vm.heure_debut;
  entity.duration = vm.duree_seance;
  entity.locationId = vm.lieu_id;
  entity.status = vm.statut;
  entity.minAge = vm.age_minimum ?? undefined;
  entity.maxAge = vm.age_maximum ?? undefined;
  entity.maxPlaces = vm.place_maximum ?? undefined;
  entity.trialAllowed = !!vm.essai_possible;
  entity.trialCount = vm.nb_essai_possible ?? undefined;
  entity.info = vm.info_seance ?? '';
  entity.nominativeCall = !!vm.convocation_nominative;
  entity.showAttendance = !!vm.afficher_present;
  entity.appointment = vm.rdv ?? '';
  entity.limitMinAge = vm.est_limite_age_minimum !== undefined;
  entity.limitMaxAge = vm.est_limite_age_maximum !== undefined;
  entity.limitPlaces = vm.est_place_maximum !== undefined;

  return entity;
}
