import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ProfessorService } from "../../crud/professor.service";
import { SessionProfessorService } from "../../crud/seanceprofesseur.service";
import { SessionProfessor } from "../../entities/seance-professeur.entity";
import { Professor } from "../../entities/professeur.entity";
import { ProfessorContract } from "../../entities/contrat_prof.entity";
import { ProfessorContractService } from "../../crud/professorcontract.service";
import { AccountService } from "../../crud/account.service";
import { ProjetView } from "@shared/lib/compte.interface";
import { ContratLight_VM, Professeur_VM} from "@shared/lib/prof.interface";

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

  async GetAll(project_id:number)  {
    const profseance : Professor[] = await this.profserv.getAll(project_id);
  return profseance.map(sp =>
      to_Professeur_VM(sp)  
    );
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

async getProfContratActif(compte_id: number): Promise<ProjetView[]> {
  const retour: ProjetView[] = [];
  const persons = await this.acc_serv.ProfCompte(compte_id);

  for (const person of persons) {
    const prof = await this.profserv.get(person.id);
    if (!prof) continue;

    const contratsActifs = prof.contracts.filter(c => c.saison.isActive);
    for (const c of contratsActifs) {
      retour.push({
        id: c.saison.projectId,
        nom: c.saison.project.name,
        prof: true,
        adherent: false,
        essai: false,
      });
    }
  }

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


export function to_Professeur_VM(p: Professor): Professeur_VM {
  const pers = p.person ?? ({} as any);

  return {
    person: {
      id: pers.id ?? p.id, // fallback
      prenom: pers.firstName ?? '',
      nom: pers.lastName ?? '',
      surnom: pers.nickname ?? undefined,
      date_naissance: pers.birthDate ?? undefined,
      sexe: pers.gender ?? undefined,
    },
    taux: p.hourlyRate,
    statut: p.status,
    num_tva: p.vatNumber,
    num_siren: p.sirenNumber,
    iban: p.iban,
    info: p.info,
    // Si les contrats n'ont pas été joints, on renvoie []
    contrats: (p.contracts?.map(mapContrat)) ?? [],
  };
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
export function mapContrat(c: ProfessorContract): ContratLight_VM {
  return {
    // -> choisis les bons noms selon ton entity:
    // ex 1 : c.typeContrat / c.typeRemuneration
    // ex 2 : c.contractType / c.remunerationType
    type_contrat: (c as any).typeContrat ?? (c as any).contractType ?? '',
    type_remuneration: (c as any).typeRemuneration ?? (c as any).remunerationType ?? '',
  };
}