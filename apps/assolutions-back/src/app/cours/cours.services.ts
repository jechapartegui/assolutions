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
  if (!date) {
    date = new Date();
  }

  // Helpers
  const normalizeJour = (j: string): string =>
    (j || '').trim().toLowerCase();

  // ISO: lun=1 ... dim=7
  const isoDay = (d: Date): number => {
    const js = d.getDay(); // 0..6 (dim..sam)
    return js === 0 ? 7 : js;
  };

  const jourToIso: Record<string, number> = {
    'lundi': 1,
    'mardi': 2,
    'mercredi': 3,
    'jeudi': 4,
    'vendredi': 5,
    'samedi': 6,
    'dimanche': 7,
  };

  const setDateToIsoWeekday = (base: Date, targetIsoDay: number): Date => {
    const curIso = isoDay(base);
    const delta = targetIsoDay - curIso; // même semaine (peut être négatif)
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + delta);
    return d;
  };

  const wantedIsoDay = jourToIso[normalizeJour(cours.jour_semaine)];
  if (!wantedIsoDay) {
    throw new BadRequestException('INVALID_JOUR_SEMAINE');
  }

  // Récupération des séances à mettre à jour
  const seances: Session[] =
    await this.seanceserv.getSeanceCoursAfterDate(cours.id, date);

  kvp.value = seances.length;

  for (const s of seances) {
    // 1) Mise à jour des champs simples
    s.locationId       = cours.lieu_id;
    s.duration         = cours.duree;
    s.showAttendance   = cours.afficher_present;
    s.appointment      = cours.rdv;
    s.label            = cours.nom;
    s.limitMaxAge      = cours.est_limite_age_maximum;
    s.limitMinAge      = cours.est_limite_age_minimum;
    s.maxPlaces        = cours.place_maximum;
    s.nominativeCall   = cours.convocation_nominative;
    s.maxAge           = cours.age_maximum;
    s.minAge           = cours.age_minimum;
    s.limitPlaces      = cours.est_place_maximum;
    s.startTime        = cours.heure;
    s.trialAllowed     = cours.essai_possible;

    // 2) Ajustement de la DATE au jour de semaine dans la même semaine que la date actuelle
    //    (si déjà le bon jour, la date reste identique)
    if (s.date) {
      const current = new Date(s.date);
      s.date = setDateToIsoWeekday(current, wantedIsoDay);
    } else {
      // Par sécurité, si s.date est vide, on base sur "date" passée en entrée
      s.date = setDateToIsoWeekday(new Date(date), wantedIsoDay);
    }

    // 3) Sync des GROUPES (diff par groupId)
    try {
     // === Sync GROUPES par diff sur groupId ===
const currentLinks = (s.groups ?? []) as Array<{ id: number; groupId: number }>;
const targetIds = new Set<number>((cours.groupes ?? []).map(g => g.id));

// liens à supprimer = liens existants dont le groupId n'est plus dans la cible
const linksToRemove = currentLinks.filter(l => !targetIds.has(l.groupId));

// ids de groupes à ajouter = groupIds cibles qui n'existent pas encore dans les liens
const existingGroupIds = new Set<number>(currentLinks.map(l => l.groupId));
const groupIdsToAdd = [...targetIds].filter(id => !existingGroupIds.has(id));

// suppression par id de lien
await Promise.all(
  linksToRemove.map(l => this.linkgroupserv.delete(l.id))
);

// création par payload objet (ADAPTE les noms de champs si besoin)
await Promise.all(
  groupIdsToAdd.map(groupId =>
    this.linkgroupserv.create({
      objectType: 'seance',   // ou 'séance' si c'est vraiment ce que ton backend attend
      objectId: s.id,
      groupId,
    })
  )
);



    } catch (e) {
      // non bloquant : on continue la MAJ de la séance
      // (tu peux logger si besoin)
    }

    // 4) Sync des PROFESSEURS via table de liaison SessionProfesseur
    try {
      const currentProfIds = new Set<number>(
        (s.seanceProfesseurs ?? []).map(p => p.professeur.professorId)
      );
      const targetProfIds = new Set<number>(
        (cours.professeursCours ?? []).map((p: PersonneLight_VM) => p.id)
      );

      const profsToAdd    = [...targetProfIds].filter(id => !currentProfIds.has(id));
      const profsToRemove = [...currentProfIds].filter(id => !targetProfIds.has(id));

      await Promise.all([
        ...profsToAdd.map(id => this.addProfesseurToSession(s.id, id)),
        ...profsToRemove.map(id => this.seanceserv.removeProfesseurFromSession(s.id, id)),
      ]);
    } catch (e) {
      // non bloquant
    }

    // 5) Sauvegarde de la séance
    try {
      await this.seanceserv.update(s.id, s);
      kvp.key += 1;
    } catch (e) {
      // Tu peux logger l'erreur si nécessaire mais on n'interrompt pas la boucle
    }
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