import { BadRequestException, Injectable,  UnauthorizedException } from "@nestjs/common";
import { LienGroupe_VM } from "@shared/lib/groupe.interface";
import { Cours_VM} from "@shared/lib/cours.interface";
import { Course } from "../../entities/cours.entity";
import { Session } from "../../entities/seance.entity";
import { CourseService } from "../../crud/course.service";
import { toPersonneLight_VM } from "../member/member.services";
import { KeyValuePairAny } from "@shared/lib/autres.interface";
import { SessionService } from "../../crud/session.service";
import { PersonneLight_VM } from "@shared/lib/personne.interface";
import { LinkGroupService } from "../../crud/linkgroup.service";
import { ProfessorContractService } from "../../crud/professorcontract.service";
import { SessionProfessorService } from "../../crud/seanceprofesseur.service";
import { SessionProfessor } from "../../entities/seance-professeur.entity";

@Injectable()
export class CoursService {
  constructor(private coursserv:CourseService, private seanceserv:SessionService, private linkgroupserv:LinkGroupService, private profcont:ProfessorContractService, private sessionprofserv : SessionProfessorService) {}

  async Get(id: number) : Promise<Cours_VM> {
    const pcours = await this.coursserv.get(id);
       if (!pcours) {
         throw new UnauthorizedException('COURSE_NOT_FOUND');
       }
       //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return toCours_VM(pcours);

  }
async GetAll(seasonId :number) : Promise<Cours_VM[]> {

  const coursList = await this.coursserv.getAll(seasonId);
  if (!coursList) {
    return [];
  }
  return coursList.map(x => toCours_VM(x));

}

  async GetAllLight(saison_id:number) {

 return this.GetAll(saison_id).then((res : Cours_VM[]) => res.map(n => {
  return {
    key: n.id,
    value: n.nom
  };
 })) 


  }

  async Add(s: Cours_VM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toCourse(s, project_id);
  return this.coursserv.create(objet_base);
}

async Update(s: Cours_VM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = toCourse(s, project_id);
  return this.coursserv.update(objet_base.id, objet_base);
}



async Delete(id: number) {
return await this.coursserv.delete(id);
}

async UpdateSerie(cours: Cours_VM, date: Date): Promise<KeyValuePairAny> {
  const kvp: KeyValuePairAny = { key: 0, value: 0 };

  if (!cours || cours.id < 1) {
    throw new BadRequestException('INVALID_ITEM');
  }
  if (!date) date = new Date();

  // Helpers
  const normalizeJour = (j: string): string => (j || '').trim().toLowerCase();
  const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay()); // 1..7 (lun..dim)
  const jourToIso: Record<string, number> = {
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7,
  };
  const setDateToIsoWeekday = (base: Date, targetIsoDay: number): Date => {
    const curIso = isoDay(base);
    const delta = targetIsoDay - curIso; // même semaine
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + delta);
    return d;
  };

  const wantedIsoDay = jourToIso[normalizeJour(cours.jour_semaine)];
  if (!wantedIsoDay) throw new BadRequestException('INVALID_JOUR_SEMAINE');

  const seances: Session[] = await this.seanceserv.getSeanceCoursAfterDate(cours.id, date);
  kvp.value = seances.length;

  for (const s of seances) {
    // 1) Calcul des nouvelles valeurs (patch strict, pas l’entité entière)
    const newDate = s.date
      ? setDateToIsoWeekday(new Date(s.date), wantedIsoDay)
      : setDateToIsoWeekday(new Date(date), wantedIsoDay);

    const patch: Partial<Session> = {
      locationId: cours.lieu_id,
      duration: cours.duree,
      showAttendance: !!cours.afficher_present,
      appointment: cours.rdv,
      label: cours.nom,
      limitMaxAge: !!cours.est_limite_age_maximum,
      limitMinAge: !!cours.est_limite_age_minimum,
      maxPlaces: cours.place_maximum,
      nominativeCall: !!cours.convocation_nominative,
      maxAge: cours.age_maximum,
      minAge: cours.age_minimum,
      limitPlaces: !!cours.est_place_maximum,
      startTime: cours.heure,
      trialAllowed: !!cours.essai_possible,
      date: newDate,
    };

    // a) MAJ des champs simples AVANT les liens (ordre déterministe)
    await this.seanceserv.update(s.id, patch);

    // 2) GROUPES — diff par groupId, suppression PUIS ajout (ordre déterministe)
    try {
      const currentLinks = (s.groups ?? []) as Array<{ id: number; groupId: number }>;
      const targetIds = new Set<number>((cours.groupes ?? []).map(g => g.id)); // <-- groupId (pas id)
      console.log(currentLinks, targetIds);
      const linksToRemove = currentLinks.filter(l => !targetIds.has(l.groupId));
      console.log(linksToRemove)
      const existingGroupIds = new Set<number>(currentLinks.map(l => l.groupId));
      const groupIdsToAdd = [...targetIds].filter(id => !existingGroupIds.has(id));
      console.log(groupIdsToAdd);
      // Suppressions d’abord
      for (const l of linksToRemove) {
        await this.linkgroupserv.delete(l.id);
      }
      // Ajouts ensuite
      for (const groupId of groupIdsToAdd) {
        await this.linkgroupserv.create({
          objectType: 'séance', // adapte si nécessaire
          objectId: s.id,
          groupId,
        });
      }
    } catch (e) {
      // non bloquant; log si besoin
    }

    // 3) PROFESSEURS — suppression PUIS ajout (ordre déterministe)
    try {
      const currentSP = (s.seanceProfesseurs ?? []) as Array<{ id: number; professeur: { professorId: number } }>;
      const currentProfIds = new Set<number>(currentSP.map(p => p.professeur.professorId));
      const targetProfIds = new Set<number>((cours.professeursCours ?? []).map((p: PersonneLight_VM) => p.id));

      const profsToRemoveIds = [...currentProfIds].filter(id => !targetProfIds.has(id));
      const profsToAddIds = [...targetProfIds].filter(id => !currentProfIds.has(id));

      // Suppressions d’abord (par id de lien SessionProfesseur)
      for (const sp of currentSP) {
        if (profsToRemoveIds.includes(sp.professeur.professorId)) {
          await this.sessionprofserv.delete(sp.id);
        }
      }
      // Ajouts ensuite
      for (const profId of profsToAddIds) {
        await this.addProfesseurToSession(s.id, profId);
      }
    } catch (e) {
      // non bloquant; log si besoin
    }

    // (optionnel) Refetch si tu veux un s à jour pour l’itération courante
    // s = await this.seanceserv.getById(s.id);

    kvp.key += 1;
  }

  return kvp;
}

  async addProfesseurToSession(id_s: number, id_p: number): Promise<SessionProfessor> {
    let seance = await this.seanceserv.get(id_s);
    let contract = await this.profcont.getProfessorContractByProfessorId(id_p, seance.seasonId);
      if (!contract) {
        throw new BadRequestException('PROFESSOR_CONTRACT_NOT_FOUND');
      }
      let session = new SessionProfessor();
      session.seanceId = id_s;
      session.professeurContractId = contract.id;
      session.cout = Number(contract.remunerationType);
      session.minutes = seance.duration || 0;
      session.status = seance.status;
      return this.sessionprofserv.create(session);
  }


}

export function toCours_VM(course: Course): Cours_VM {
  
  return {
    id: course.id,
    nom: course.name,
    jour_semaine: course.weekDay,
    heure: course.time,
    duree: course.duration,
    prof_principal_id: course.mainProfessorId,
    lieu_id: course.locationId,
    saison_id: course.seasonId,
    rdv : course.appointment ?? '',
    age_minimum: course.minAge ?? undefined,
    age_maximum: course.maxAge?? undefined,
    place_maximum: course.maxPlaces?? undefined,

    convocation_nominative: course.nominativeCall,
    afficher_present: course.showAttendance,

    // Ces flags sont calculés à partir des limites définies
    est_limite_age_minimum: course.minAge != null,
    est_limite_age_maximum: course.maxAge != null,
    est_place_maximum:    course.maxPlaces != null,
    essai_possible: course.trialAllowed,
    // Champ enrichi
    lieu_nom: course.location?.name|| '',

    // Professeurs liés
    professeursCours: (course.professors ?? []).map(cp => ( toPersonneLight_VM(cp.contract.professor.person))),

    // Groupes liés
    groupes: (course.groups ?? []).map(lg =>
      new LienGroupe_VM(lg.groupId, lg.group?.name ?? '', lg.id)
    ),
  };
}

/**
 * Transforme un Cours_VM (+ projectId) en entité Course prête à être persistée.
 */
export function toCourse(vm: Cours_VM, projectId: number): Course {
  const c = new Course();

  if (vm.id) {
    c.id = vm.id;  // pour les updates
  }

  c.projectId        = projectId;
  c.name             = vm.nom;
  c.weekDay          = vm.jour_semaine;
  c.time             = vm.heure;
  c.duration         = vm.duree;
  c.mainProfessorId  = vm.prof_principal_id;
  c.locationId       = vm.lieu_id;
  c.seasonId         = vm.saison_id;
  c.appointment   =vm.rdv;
  c.trialAllowed = vm.essai_possible;
if(vm.est_limite_age_maximum){
  c.maxAge           = vm.age_maximum!;
} else {
  c.maxAge = null;
}
if(vm.est_limite_age_minimum){
  c.minAge = vm.age_minimum!;
} else {
  c.minAge = null
}
if(vm.est_place_maximum){
  c.maxPlaces = vm.place_maximum!;
} else {
  c.maxPlaces = null;
}

  c.nominativeCall   = vm.convocation_nominative;
  c.showAttendance   = vm.afficher_present;

  // On ne touche pas ici à 'professors', 'groups' ou 'sessions'
  // qui relèvent d'une logique de liaison / cascade séparée.

  return c;
}