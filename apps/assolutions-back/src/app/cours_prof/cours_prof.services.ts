import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Lieu_VM } from "@shared/lib/lieu.interface";
import { Location } from "../../entities/lieu.entity";
import { Adresse } from "@shared/lib/adresse.interface";
import { CourseProfessorService } from "../../crud/courseprofessor.service";
import { toPersonneLight_VM } from "../member/member.services";
import { PersonneLight_VM } from "@shared/lib/personne.interface";
import { CourseProfessor } from "../../entities/cours_professeur.entity";
import { CourseService } from "../../crud/course.service";
import { ProfessorContractService } from "../../crud/professorcontract.service";

@Injectable()
export class CoursProfService {
  constructor(private courseprof_serv:CourseProfessorService, private courseserv:CourseService, private contratprofserv: ProfessorContractService) {}
  async get(id: number) : Promise<PersonneLight_VM> {
    const p = await this.courseprof_serv.get(id);
    if (!p) {
      throw new UnauthorizedException('COURSE_PROFESSOR_NOT_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return toPersonneLight_VM(p.contract.professor.person);

  }
  async getAll(course_id: number) : Promise<PersonneLight_VM[]> {
    const px = await this.courseprof_serv.getAll(course_id);
    if (!px) {
     return [];
    }
    return px.map((p) => {
      return toPersonneLight_VM(p.contract.professor.person);
    });
  }

  
    async add(cours_id: number, person_id:number):Promise<number> {
    if (!cours_id || !person_id) {
      throw new BadRequestException('INVALID_COURSE_PROFESSOR');
    }

    const objet_base = new CourseProfessor();
    objet_base.id = 0;
    objet_base.courseId = cours_id;
    let cours = this.courseserv.get(cours_id);
    if(!cours){
      throw new BadRequestException('INVALID_COURSE');
    }
    let contratprof = this.contratprofserv.getAllSaison((await cours).seasonId);
     if(!contratprof){
      throw new BadRequestException('INVALID_PERSON');
    }
    let contratprofid = (await contratprof).find(x => x.professorId == person_id);
    if(!contratprofid){
      throw new BadRequestException('INVALID_PERSON');
    }
    objet_base.contractId = contratprofid.id
    const objet_insere = await this.courseprof_serv.create(objet_base);
    return objet_insere.id;
  }
  
  async delete(cours_id: number, person_id:number):Promise<boolean> {
     if (!cours_id || !person_id) {
      throw new BadRequestException('INVALID_COURSE_PROFESSOR');
    }
    const foundobjet =  this.courseprof_serv.getBy(cours_id, person_id);
     if (!foundobjet) {
      throw new BadRequestException('INVALID_COURSE_PROFESSOR');
    }
     try{
    await this.courseprof_serv.delete((await foundobjet).id);
    return true;
     } catch{
      return false;
     }
  }
  
  
  
}

export function toLieu_VM(location: Location): Lieu_VM {
  // Si tu stockes l'adresse en JSON dans la colonne address
  const adresse: Adresse = JSON.parse(location.address);

  return {
    id:         location.id,
    nom:        location.name,
    adresse,    // objet de type Adresse
  };
}

/**
 * Transforme un view-model Lieu_VM (et un projectId) en entité Location prête à être sauvée.
 */
export function toLocation(vm: Lieu_VM, projectId: number): Location {
  const loc = new Location();

  if (vm.id) {
    loc.id = vm.id;               // utile si tu fais un update
  }

  loc.projectId = projectId;
  loc.name      = vm.nom;
  loc.address   = JSON.stringify(vm.adresse);  // stringify pour stocker en TEXT/JSONB
  // loc.isPublic reste à false par défaut à la création,
  // ou tu peux ajouter un paramètre isPublic si besoin.

  return loc;
}