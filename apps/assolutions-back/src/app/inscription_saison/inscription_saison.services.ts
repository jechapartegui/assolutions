import { BadRequestException, Injectable,  UnauthorizedException } from "@nestjs/common";
import { InscriptionSaison_VM } from "@shared/lib/inscription_saison.interface";
import { RegistrationSeason } from "../../entities/inscription-saison.entity";
import { RegistrationSeasonService } from "../../crud/inscriptionsaison.service";
import { LienGroupe_VM } from "@shared/lib/groupe.interface";

@Injectable()
export class InscriptionSaisonService {
  constructor(
    private inscriptionsaisonserv:RegistrationSeasonService
  ) {}

  async Get(id: number) {
     const pIS = await this.inscriptionsaisonserv.get(id);
       if (!pIS) {
         throw new UnauthorizedException('REGISTRATION_SEASON_NOT_FOUND');
       }
       //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return toInscriptionSaison_VM(pIS);

  }
    async GetAllSeasonRider(saisonId: number, personneId:number) {
     const pIS = await this.inscriptionsaisonserv.getAllSeasonRider(saisonId, personneId);
       if (!pIS) {
         throw new UnauthorizedException('REGISTRATION_SEASON_NOT_FOUND');
       }
       //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return toInscriptionSaison_VM(pIS);

  }
  
   async GetAllRider(rider_id: number, project_id:number) {
    const pISSs = await this.inscriptionsaisonserv.getPersonRegistrations(rider_id, project_id);
    if (!pISSs) {
         return [];
        }
        return pISSs.map((pISS) => {
          return toInscriptionSaison_VM(pISS);
        });

  }
   async GetAllSaison(saison_id:number) {
    const pISSs = await this.inscriptionsaisonserv.getAllSeason(saison_id);
    if (!pISSs) {
         return [];
        }
        return pISSs.map((pISS) => {
          return toInscriptionSaison_VM(pISS);
        });

  }

  async Add(inscription: InscriptionSaison_VM) {
    if (!inscription) {
         throw new BadRequestException('INVALID_REGISTRATION_SEASON');
       }
       const objet_base = toRegistrationSeason(inscription);
     
       const objet_insere = await this.inscriptionsaisonserv.create(objet_base);
       return objet_insere.id;
}
async Update(inscription: InscriptionSaison_VM) {
  if (!inscription) {
         throw new BadRequestException('INVALID_REGISTRATION_SEASON');
       }
    const objet_base = toRegistrationSeason(inscription);
await this.inscriptionsaisonserv.update(objet_base.id, objet_base);
}

async Delete(id: number) {
   try{
    await this.inscriptionsaisonserv.delete(id);
    return true;
     } catch{
      return false;
     }
} 

}
export function toInscriptionSaison_VM(obj:RegistrationSeason): InscriptionSaison_VM{
  const item = new InscriptionSaison_VM();
  item.id = obj.id;
  item.groupes = obj.groups?.map(x => new LienGroupe_VM(x.groupId, x.group.name, x.id)) ?? [];
  item.rider_id = obj.personneId;
  item.saison_id = obj.saisonId;
  if (obj.saison) {
    item.active = obj.saison.isActive
  } else {
    item.active = false;
  }
  return item;
}

export function toRegistrationSeason(vm:InscriptionSaison_VM) : RegistrationSeason{
 const entity = new RegistrationSeason();
 entity.id = vm.id ?? 0;
 entity.personneId = vm.rider_id;
 entity.saisonId = vm.saison_id;
 entity.id = vm.id;
 return entity;
}

