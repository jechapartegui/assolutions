import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ProfessorService } from "../../crud/professor.service";
import { SessionProfessorService } from "../../crud/seanceprofesseur.service";
import { SessionProfessor } from "../../entities/seance-professeur.entity";
import { Professor } from "../../entities/professeur.entity";
import { Professeur_VM } from "@shared/src";
import { ProfessorContract } from "../../entities/contrat_prof.entity";
import { ProfessorContractService } from "../../crud/professorcontract.service";

@Injectable()
export class ProfService {
  constructor(private profserv:ProfessorService, private profseanceserv:SessionProfessorService, private contractprofservice:ProfessorContractService
  ) {}
  async Get(id: number) {
       const pIS = await this.profserv.get(id);
          if (!pIS) {
            throw new UnauthorizedException('PROFESSOR_NOT_FOUND');
          }
          //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
          return to_Professeur_VM(pIS);
  }

   async GetProfSeance(seance_id: number)  {
    const profseance : SessionProfessor[] = await this.profseanceserv.getAllSeance(seance_id);
  return profseance.map(sp =>
      to_Professeur_VM(sp.professeur.professor)  
    );
  }
  async GetProfSaison(saison_id: number)  {
   const contrat_prof:ProfessorContract[] = await this.contractprofservice.getAllSaison(saison_id)
    return contrat_prof.map(sp =>
      to_Professeur_VM(sp.professor)  
    );
  }

    async add(s: Professeur_VM):Promise<number> {
       if (!s) {
         throw new BadRequestException('INVALID_PROFESSOR');
       }
       const objet_base = to_Professor(s);    
       const objet_insere = await this.profseanceserv.create(objet_base);
       return objet_insere.id;
     }
     async update(s: Professeur_VM) {
         if (!s) {
         throw new BadRequestException('INVALID_PROFESSOR');
       }
       const objet_base = to_Professor(s);     
        await this.profseanceserv.update(objet_base.id, objet_base);
     
     }
     
     async delete(id: number):Promise<boolean> {
        try{
       await this.profseanceserv.delete(id);
       return true;
        } catch{
         return false;
        }
     }  
 }

export function to_Professeur_VM(entity:Professor) : Professeur_VM{
  const vm = new Professeur_VM();
  vm.person = to_PersonneLight(entity.person);
  vm.iban = entity.iban;
  vm.info = entity.info;
  vm.num_siren = entity.sirenNumber;
  vm.num_tva = entity.vatNumber;
  vm.statut = entity.status;
  vm.taux = entity.hourlyRate;
  return vm;
}
export function to_Professor(vm:Professeur_VM) : Professor{
  const entity = new Professor();
  entity.iban =vm.iban;
  entity.info = vm.info;
  entity.id = vm.person.id;
  entity.hourlyRate = vm.taux;
  entity.sirenNumber = vm.num_siren;
  entity.status = vm.statut;
  entity.vatNumber = vm.num_tva
  return entity;
}