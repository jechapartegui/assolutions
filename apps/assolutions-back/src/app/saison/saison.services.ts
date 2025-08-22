import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Saison_VM } from "@shared/lib/saison.interface";
import { SeasonService } from "../../crud/season.service";
import { Season } from "../../entities/saison.entity";

@Injectable()
//   this.url = environment.maseance + 'api/inscription_seance/get/' + id;
//  this.url = environment.maseance + 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = environment.maseance + 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = environment.maseance + 'api/inscription_seance/add';
//     this.url = environment.maseance + 'api/inscription_seance/update';
//  this.url = environment.maseance + 'api/inscription_seance/delete/' + id;
export class SaisonService {
  constructor(private saisonserv:SeasonService
  ) {}

  async Get(id: number) {
       const pIS = await this.saisonserv.get(id);
         if (!pIS) {
           throw new UnauthorizedException('SEASON_NOT_FOUND');
         }
         //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
         return toSaison_VM(pIS);
  }
  async GetSaisonActive(id: number) {
        const pIS = await this.saisonserv.getActive(id);
         if (!pIS) {
           throw new UnauthorizedException('SEASON_NOT_FOUND');
         }
         //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
         return toSaison_VM(pIS);
  }

   async GetAll(project_id:number) {
     const pISSs = await this.saisonserv.getAll(project_id);
       if (!pISSs) {
            return [];
           }
           return pISSs.map((pISS) => {
             return toSaison_VM(pISS);
           });

  }
  async GetAllLight(project_id:number) {
       const pISSs = await this.saisonserv.getAll(project_id);
       if (!pISSs) {
            return [];
           }
           return pISSs.map((pISS) => {
           return {
    key: pISS.id,
    value: pISS.name
  };
           });


  }

   async add(s: Saison_VM, project_id :number):Promise<number> {
      if (!s) {
        throw new BadRequestException('INVALID_LOCATION');
      }
      const objet_base = toSeason(s, project_id);    
      const objet_insere = await this.saisonserv.create(objet_base);
      return objet_insere.id;
    }
    async update(s: Saison_VM, project_id :number) {
        if (!s) {
        throw new BadRequestException('INVALID_LOCATION');
      }
      const objet_base = toSeason(s, project_id);    
       await this.saisonserv.update(objet_base.id, objet_base);
    
    }
    
    async delete(id: number):Promise<boolean> {
       try{
      await this.saisonserv.delete(id);
      return true;
       } catch{
        return false;
       }
    }  
}

export function toSeason(data:Saison_VM, project_id:number) : Season{
  const obj = new Season();
  obj.id = data.id;
  obj.name = data.nom;
  obj.projectId = project_id;
  obj.startDate = data.date_debut;
  obj.endDate = data.date_fin;
  obj.isActive = data.active;
  return obj;
}

export function toSaison_VM(entity:Season) : Saison_VM{
 const obj = new Saison_VM();
 obj.active = entity.isActive;
 obj.date_debut  = entity.startDate;
 obj.date_fin = entity.endDate;
 obj.id = entity.id;
 obj.nom = entity.name;
 return obj;
}