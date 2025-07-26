import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ProfessorService } from "../../crud/professor.service";
import { SessionProfessorService } from "../../crud/seanceprofesseur.service";
import { SessionProfessor } from "../../entities/seance-professeur.entity";
import { Professor } from "../../entities/professeur.entity";
import { Professeur_VM, ProjetView } from "@shared/src";
import { ProfessorContract } from "../../entities/contrat_prof.entity";
import { ProfessorContractService } from "../../crud/professorcontract.service";
import { toPersonneLight_VM } from "../member/member.services";
import { AccountService } from "../../crud/account.service";

@Injectable()
export class ProfService {
  constructor(private profserv:ProfessorService, private profseanceserv:SessionProfessorService, private contractprofservice:ProfessorContractService, private acc_serv:AccountService
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

  async getProfContratActif(compte_id:number) : Promise<ProjetView[]>{
    let retour:ProjetView[] = [];
    const persons = await this.acc_serv.adherentCompte(compte_id);
    
     persons.forEach(async (person) =>{
      let prof =  await this.profserv.get(person.id);
      console.warn(prof);
      if(prof){
       let cont =  prof.contracts.filter(x => x.saison.isActive);
       if(cont){
        cont.forEach((_cont) =>{
  const pv :ProjetView = {
          id: _cont.saison.projectId,
          nom : _cont.saison.project.name,
          prof : true,
          adherent : false,
          essai : false
        }
        retour.push(pv);
        })
      
       }
      }
     
       });
       return retour;

  }

    async add(s: Professeur_VM):Promise<number> {
       if (!s) {
         throw new BadRequestException('INVALID_PROFESSOR');
       }
       const objet_base = to_Professor(s);    
       const objet_insere = await this.profserv.create(objet_base);
       return objet_insere.id;
     }
     async update(s: Professeur_VM) {
         if (!s) {
         throw new BadRequestException('INVALID_PROFESSOR');
       }
       const objet_base = to_Professor(s);     
        await this.profserv.update(objet_base.id, objet_base);
     
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
  vm.person = toPersonneLight_VM(entity.persons);
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