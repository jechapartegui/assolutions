import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { KeyValuePair } from "@shared/src/lib/autres.interface";
import { LienGroupe_VM } from "@shared/src/lib/groupe.interface";
import { Cours_VM, CoursProfesseurVM } from "@shared/src/lib/cours.interface";
import { Course } from "../../entities/cours.entity";
import { CourseService } from "../../crud/course.service";

@Injectable()
export class CoursService {
  constructor(private coursserv:CourseService) {}

  async Get(id: number) {
    const pcours = await this.coursserv.get(id);
       if (!pcours) {
         throw new UnauthorizedException('COURSE_NOT_FOUND');
       }
       //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return toCours_VM(pcours);

  }
async GetAll(projectId: number, seasonId :number, dateDebut:Date, dateFin:Date) {
  const coursList = await this.CoursRepo.find({ where: { saison_id } });
  if (!coursList) {
    throw new UnauthorizedException('NO_ITEM_FOUND');
  }

  const results = await Promise.all(
    coursList.map(async (s) => {
      const result = this.to_cours(s);
      result.groupes = await this.getGroupesForCours(s.id);
      return result;
    })
  );

  return results;
}

  async GetAllLight(saison_id:number) {
    const pISSs = await this.CoursRepo.find({ where: { saison_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_ITEM_FOUND');
    }
 return pISSs.map((plieu): KeyValuePair => {
  return {
    key: plieu.id,
    value: plieu.nom
  };
});


  }

  async Add(s: CoursVM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = this.toCours(s, project_id);
  const newISS = this.CoursRepo.create(objet_base);
  const saved = await this.CoursRepo.save(newISS);
    await this.updateGroupesForCours(saved.id, s.groupes);
  // 🔁 Ajouter les liaisons professeurs
  await this.updateCoursProfesseurs(saved.id, s.professeursCours);

  return saved.id;
}

async Update(s: CoursVM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = this.toCours(s, project_id);
  const existing = await this.CoursRepo.findOne({ where: { id: s.id } });

  if (!existing) {
    throw new NotFoundException('ITEM_NOT_FOUND');
  }

  const updated = await this.CoursRepo.save({ ...existing, ...objet_base });

  // 🔁 Mettre à jour les liaisons professeurs
    await this.updateGroupesForCours(updated.id, s.groupes);
  await this.updateCoursProfesseurs(updated.id, s.professeursCours);

  return true;
}

private async updateCoursProfesseurs(cours_id: number, profs: CoursProfesseurVM[]) {
  // Supprimer les liaisons existantes
  await this.CoursProfRepo.delete({ cours_id });

  // Recréer les liaisons à partir des id
  const newLiaisons = profs.map(kvp => {
    const cp = new CoursProfesseur();
    cp.cours_id = cours_id;
    cp.prof_id = Number(kvp.prof_id);
    return cp;
  });

  await this.CoursProfRepo.save(newLiaisons);
}


async Delete(id: number) {
  const toDelete = await this.CoursRepo.findOne({ where: { id } });
  await this.CoursProfRepo.delete({ cours_id :id});
  await this.LienGroupeRepo.delete({ objet_type: 'cours', objet_id: id });

  if (!toDelete) {
    throw new NotFoundException('ITEM_NOT_FOUND');
  }

  await this.CoursRepo.remove(toDelete);
  return { success: true };
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

    age_minimum: course.minAge,
    age_maximum: course.maxAge,
    place_maximum: course.maxPlaces,

    convocation_nominative: course.nominativeCall,
    afficher_present: course.showAttendance,

    // Ces flags sont calculés à partir des limites définies
    est_limite_age_minimum: course.minAge != null,
    est_limite_age_maximum: course.maxAge != null,
    est_place_maximum:    course.maxPlaces != null,

    // Champ enrichi
    lieu_nom: course.location?.name,

    // Professeurs liés
    professeursCours: (course.professors ?? []).map(cp => ({
      id:           cp.id,
      cours_id:     cp.courseId,
      professeur_id: cp.professorId,
      minutes:      cp.minutes ?? null,
      taux_horaire: cp.rate ?? null,
      minutes_payees: cp.paidMinutes,
      statut:       cp.status,
      info:         cp.info ?? '',
      nom:          cp.professor?.person?.lastName  ?? '',
      prenom:       cp.professor?.person?.firstName ?? '',
    } as CoursProfesseurVM)),

    // Groupes liés
    groupes: (course.groups ?? []).map(lg =>
      new LienGroupe_VM(lg.groupId, lg.id, lg.group?.name ?? '')
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

  c.minAge           = vm.age_minimum;
  c.maxAge           = vm.age_maximum;
  c.maxPlaces        = vm.place_maximum;

  c.nominativeCall   = vm.convocation_nominative;
  c.showAttendance   = vm.afficher_present;

  // On ne touche pas ici à 'professors', 'groups' ou 'sessions'
  // qui relèvent d'une logique de liaison / cascade séparée.

  return c;
}