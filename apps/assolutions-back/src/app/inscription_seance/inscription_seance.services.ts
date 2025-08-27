import { BadRequestException, Injectable,  UnauthorizedException } from "@nestjs/common";
import { RegistrationSessionService } from "../../crud/inscriptionseance.service";
import { FullInscriptionSeance_VM, InscriptionSeance_VM, InscriptionStatus_VM, SeanceStatus_VM } from "@shared/lib/inscription_seance.interface";
import { InscriptionStatus, RegistrationSession, SeanceStatus } from "../../entities/inscription-seance.entity";
import { toPersonne_VM } from "../member/member.services";
import { SessionService } from "../../crud/session.service";
import { LinkGroupService } from "../../crud/linkgroup.service";
import { PersonService } from "../../crud/person.service";

@Injectable()
export class InscriptionSeanceService {
  constructor(
    private inscriptionseanceserv:RegistrationSessionService,
    private seanceserv: SessionService,
    private linkgroup_serv: LinkGroupService,
    private personserv:PersonService
  ) {}

  async Get(id: number) {
     const pIS = await this.inscriptionseanceserv.get(id);
       if (!pIS) {
         throw new UnauthorizedException('REGISTRATION_SESSION_NOT_FOUND');
       }
       //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return to_InscriptionSeances_VM(pIS);

  }
   async GetFull(id: number) {
    const pISS = await this.inscriptionseanceserv.get(id);
    if (!pISS) {
      throw new UnauthorizedException('REGISTRATION_SESSION_NOT_FOUND');
    }
   
    return to_FullInscriptionSeance_VM(pISS);

  }
   async FaireEssai(personId : number, sessionId: number) {
    if (!personId || !sessionId) {
      throw new BadRequestException('INVALID_PERSON_SESSION');
    }
    const regsession = new RegistrationSession();
    regsession.dateInscription = new Date();
    regsession.statutInscription = InscriptionStatus.ESSAI;
    regsession.personId = personId;
    regsession.seanceId = sessionId;
    regsession.statutSeance = undefined;
  const objet_insere = await this.inscriptionseanceserv.create(regsession);
       return objet_insere.id;
}
   async GetAllRiderSaison(rider_id: number, saison_id:number) {
    const pISSs = await this.inscriptionseanceserv.getAllRiderSaison(rider_id, saison_id);
    if (!pISSs) {
         return [];
        }
        return pISSs.map((pISS) => {
          return to_InscriptionSeances_VM(pISS);
        });

  }
   async GetAllSeance(seance_id:number) : Promise<InscriptionSeance_VM[]> {
    const pISSs = await this.inscriptionseanceserv.getAllSeance(seance_id);
    if (!pISSs) {
         return [];
        }
        return pISSs.map((pISS) => {
          return to_InscriptionSeances_VM(pISS);
        });

  }
   async GetAllSeanceFull(seance_id:number) : Promise<FullInscriptionSeance_VM[]> {
    const pISSs = await this.inscriptionseanceserv.getAllSeance(seance_id);
    const ss = await this.seanceserv.get(seance_id);
    ss.groups = await this.linkgroup_serv.getGroupsForObject('séance', ss.id);
    console.log(ss.groups);
    let list_id = [];
    ss.groups.forEach(async (gr) =>{
    let ridersgroup =  await this.linkgroup_serv.getObjectForGroups("rider", gr.id);
    list_id.push(ridersgroup.map(x => x.objectId));
    })
    console.log(list_id);
    list_id.forEach(async (id)=>{
      let _p = await this.personserv.get(id);
      //regle age
      let rs = new RegistrationSession();
      rs.personId = 0;
      rs.person = _p;
      rs.seanceId = ss.id;
      rs.seance = ss;
      rs.statutInscription = null;
      rs.statutSeance = null;
      pISSs.push(rs);
    })

    if (!pISSs) {
         return [];
        }
        return pISSs.map((pISS) => {
          return to_FullInscriptionSeance_VM(pISS);
        });

  }

  async Add(inscription: InscriptionSeance_VM) {
    if (!inscription) {
         throw new BadRequestException('INVALID_REGISTRATION_SESSION');
       }
       const objet_base = toRegistrationSession(inscription);
     
       const objet_insere = await this.inscriptionseanceserv.create(objet_base);
       return objet_insere.id;
}
async Update(inscription: InscriptionSeance_VM) {
  if (!inscription) {
         throw new BadRequestException('INVALID_REGISTRATION_SESSION');
       }
    const objet_base = toRegistrationSession(inscription);
await this.inscriptionseanceserv.update(objet_base.id, objet_base);
}

async Delete(id: number) {
   try{
    await this.inscriptionseanceserv.delete(id);
    return true;
     } catch{
      return false;
     }
}



 

}
export function to_InscriptionSeances_VM(obj:RegistrationSession): InscriptionSeance_VM{
  const item = new InscriptionSeance_VM();
  item.date_inscription=obj.dateInscription;
  item.id = obj.id;
  item.rider_id = obj.person.id;
  item.seance_id = obj.seanceId;
  item.statut_inscription = toInscriptionStatusVM(obj.statutInscription);
  item.statut_seance = toSeanceStatusVM(obj.statutSeance);
  return item;
}
export function to_FullInscriptionSeance_VM(obj:RegistrationSession): FullInscriptionSeance_VM{
  const item = new FullInscriptionSeance_VM();
  item.date_inscription=obj.dateInscription;
  item.id = obj.id;
  item.person = toPersonne_VM(obj.person);
  item.seance_id = obj.seanceId;
  item.isVisible = false;
  item.statut_inscription = toInscriptionStatusVM(obj.statutInscription);
  item.statut_seance = toSeanceStatusVM(obj.statutSeance);
  return item;
}

export function toRegistrationSession(data:InscriptionSeance_VM) : RegistrationSession{
 const entity = new RegistrationSession();
 entity.dateInscription = data.date_inscription;
 entity.id = data.id ?? 0;
 entity.personId = data.rider_id;
 entity.seanceId = data.seance_id;
 entity.statutInscription = toInscriptionStatusEntity(data.statut_inscription);
 entity.statutSeance = toSeanceStatusEntity( data.statut_seance);
 return entity;
}

export function toInscriptionStatusVM(s?: InscriptionStatus): InscriptionStatus_VM | undefined {
  switch (s) {
    case InscriptionStatus.PRESENT:  return InscriptionStatus_VM.PRESENT;
    case InscriptionStatus.ABSENT:   return InscriptionStatus_VM.ABSENT;
    case InscriptionStatus.CONVOQUE: return InscriptionStatus_VM.CONVOQUE;
    case InscriptionStatus.ESSAI:    return InscriptionStatus_VM.ESSAI;
    default:                         return undefined;
  }
}

export function toInscriptionStatusEntity(s?: InscriptionStatus_VM): InscriptionStatus | undefined {
  switch (s) {
    case InscriptionStatus_VM.PRESENT:  return InscriptionStatus.PRESENT;
    case InscriptionStatus_VM.ABSENT:   return InscriptionStatus.ABSENT;
    case InscriptionStatus_VM.CONVOQUE: return InscriptionStatus.CONVOQUE;
    case InscriptionStatus_VM.ESSAI:    return InscriptionStatus.ESSAI;
    default:                            return undefined;
  }
}
export function toSeanceStatusVM(s?: SeanceStatus): SeanceStatus_VM | undefined {
  switch (s) {
    case SeanceStatus.PRESENT: return SeanceStatus_VM.PRESENT;
    case SeanceStatus.ABSENT:  return SeanceStatus_VM.ABSENT;
    default:                   return undefined;
  }
}

export function toSeanceStatusEntity(s?: SeanceStatus_VM): SeanceStatus | undefined {
  switch (s) {
    case SeanceStatus_VM.PRESENT: return SeanceStatus.PRESENT;
    case SeanceStatus_VM.ABSENT:  return SeanceStatus.ABSENT;
    default:                      return undefined;
  }
}