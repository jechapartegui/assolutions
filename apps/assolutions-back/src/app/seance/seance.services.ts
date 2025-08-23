import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LienGroupe_VM } from '@shared/lib/groupe.interface';
import { MesSeances_VM, Seance_VM, SeanceProfesseur_VM } from '@shared/lib/seance.interface';
import { SessionService } from '../../crud/session.service';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { Session } from '../../entities/seance.entity';
import { toPersonneLight_VM } from '../member/member.services';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { SessionProfessor } from '../../entities/seance-professeur.entity';
import { SessionProfessorService } from '../../crud/seanceprofesseur.service';
import { ProfessorContractService } from '../../crud/professorcontract.service';
import { LinkGroup } from '../../entities/lien_groupe.entity';

@Injectable()
export class SeanceService {
  constructor(private seanceserv:SessionService, private sessionprof_serv:SessionProfessorService, private inscriptionseance_serv:RegistrationSessionService, private liengroup_serv:LinkGroupService, private contractprofserv:ProfessorContractService
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

    async GetAllPublic(saison_id: number): Promise<Seance_VM[]> {
  const seanceListe = await this.seanceserv.getAllPublic(saison_id);
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
  
// helpers natifs
parseYMDToLocalDate(input: string | Date): Date {
  if (input instanceof Date) {
    // normalise à minuit local
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0);
  }
  // attend "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!m) throw new Error('Format de date invalide, attendu YYYY-MM-DD');
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  return new Date(y, mo, d, 0, 0, 0, 0); // minuit local, évite UTC
}

startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

 normalizeFR(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
DOW_FR: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};
// ---- ta méthode adaptée ----
async AddRange(
  seance: Seance_VM,
  date_debut_serie: string | Date,   // reçoit "2025-08-01" ou Date
  date_fin_serie: string | Date,     // reçoit "2025-08-31" ou Date
  jour_semaine: string               // "lundi"
): Promise<Seance_VM[]> {
  const startDate = startOfDay(this.parseYMDToLocalDate(date_debut_serie));
  const endDate   = endOfDay(this.parseYMDToLocalDate(date_fin_serie));

  const targetDow = this.DOW_FR[this.normalizeFR(jour_semaine)];
  if (targetDow === undefined) throw new Error('jour_semaine invalide');

  const seances: Seance_VM[] = [];

  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    if (currentDate.getDay() === targetDow) {
      const newSeance: Seance_VM = { ...seance, date_seance: new Date(currentDate) }; // Date JS native
      const saved = await this.Add(newSeance);
      newSeance.seance_id = saved.seance_id;

      if (newSeance.groupes?.length) {
        for (const lig of newSeance.groupes) {
          const lig_g = new LinkGroup();
          lig_g.groupId = lig.id;
          lig_g.objectId = saved.seance_id;
          lig_g.objectType = "séance";
          await this.liengroup_serv.create(lig_g);
        }
      }
      if (newSeance.seanceProfesseurs?.length) {
        await this.UpdateSeanceProf(Number(newSeance.seance_id), newSeance.seanceProfesseurs);
      }
      seances.push(newSeance);
    }
  }

  return seances;
}

 async Add(s: Seance_VM) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toSession(s);
  const entity = await this.seanceserv.create(objet_base);
  return to_Seance_VM(entity);
}

async Update(s: Seance_VM) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toSession(s);
  const entity = await this.seanceserv.update(objet_base.id, objet_base);
  return to_Seance_VM(entity);
}



async Delete(id: number) {
return await this.seanceserv.delete(id);
}
  async UpdateSeanceProf(seance_id: number, liste_seance_prof: SeanceProfesseur_VM[]) {
  if (!seance_id || !liste_seance_prof) {
    throw new BadRequestException('INVALID_ITEM');
  }
  const st = await this.seanceserv.get(seance_id);
  if (!st) {
    //checker si c'est pas un delete :
    const liste_prof = await this.sessionprof_serv.getAllSeance(seance_id);
    if (liste_prof.length > 0) {
      liste_prof.forEach(async (sp :SessionProfessor) => {
        await this.sessionprof_serv.delete(sp.id);
      });
    }
    return [];    
  }
  st.seanceProfesseurs.forEach(async (sp) => {
  if (!liste_seance_prof.find(x => x.id === sp.id)) {
      await this.sessionprof_serv.delete(sp.id);
    }});
  liste_seance_prof.forEach(async (x) => {
    if (!st.seanceProfesseurs.find(sp => sp.id === x.id)) {
      const pc = await this.contractprofserv.getSeasonProf(st.seasonId, x.personne.id);
      if(pc){

      const newSp = new SessionProfessor();
      newSp.seanceId = seance_id;
      newSp.professeurContractId = pc.id;//
      newSp.status = x.statut;
      newSp.minutes = x.minutes;
      newSp.cout = x.cout;
      newSp.info = x.info;
      await this.sessionprof_serv.create(newSp);
      }}
    });

  return (await this.seanceserv.get(seance_id)).seanceProfesseurs.map(w => to_SeanceProfesseur_VM(w));
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

export function to_Seance_VM(entity: Session): Seance_VM {
  const vm = new Seance_VM();

  vm.seance_id = entity.id;
  vm.saison_id = entity.seasonId;
  vm.cours = entity.courseId ?? 0;
  vm.libelle = entity.label ?? '';
  vm.type_seance = entity.type;
vm.date_seance = entity.date;
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
  if(entity.seanceProfesseurs) {
  vm.seanceProfesseurs = entity.seanceProfesseurs.map(x => to_SeanceProfesseur_VM(x)  );
  } else {
  vm.seanceProfesseurs = [];
  }
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
  entity.courseId = vm.cours && vm.cours !== 0 ? vm.cours : undefined;
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

export function to_SeanceProfesseur_VM(entity: SessionProfessor): SeanceProfesseur_VM {
  const vm = new SeanceProfesseur_VM();
  vm.id = entity.id;
  vm.seance_id = entity.seanceId;
  vm.personne = toPersonneLight_VM(entity.professeur.professor.person);
  vm.statut = entity.status;
  vm.minutes = entity.minutes;
  vm.cout = entity.cout ?? 0;
  vm.info = entity.info ?? '';
  return vm;
}
