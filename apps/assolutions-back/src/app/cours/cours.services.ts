import { BadRequestException, Injectable,  UnauthorizedException } from "@nestjs/common";
import { LienGroupe_VM } from "@shared/src/lib/groupe.interface";
import { Cours_VM} from "@shared/src/lib/cours.interface";
import { Course } from "../../entities/cours.entity";
import { CourseService } from "../../crud/course.service";
import { toPersonneLight_VM } from "../member/member.services";

@Injectable()
export class CoursService {
  constructor(private coursserv:CourseService) {}

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
    lieu_nom: course.location?.name,

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