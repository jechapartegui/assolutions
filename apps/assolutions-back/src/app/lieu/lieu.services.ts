import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Lieu_VM } from "@shared/lib/lieu.interface";
import { KeyValuePair } from "@shared/lib/autres.interface";
import { LocationService } from "../../crud/location.service";
import { Location } from "../../entities/lieu.entity";
import { Adresse } from "@shared/lib/adresse.interface";

@Injectable()
export class LieuService {
  constructor(private location_serv:LocationService) {}
  async get(id: number) : Promise<Lieu_VM> {
    const plieu = await this.location_serv.get(id);
    if (!plieu) {
      throw new UnauthorizedException('LOCATION_NOT_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return toLieu_VM(plieu);

  }
  async getAll(project_id: number, ispublic:boolean = false) : Promise<Lieu_VM[]> {
    const lieux = await this.location_serv.getAll(project_id, ispublic);
    if (!lieux) {
     return [];
    }
    return lieux.map((plieu) => {
      return toLieu_VM(plieu);
    });
  }



  
    async getAllLight(project_id:number, ispublic:boolean = false) : Promise<KeyValuePair[]> {
        const lieux = await this.location_serv.getAll(project_id, ispublic);
    if (!lieux) {
     return [];
    }
    return lieux.map(plieu => ({
      key: plieu.id,
      value: plieu.name,
    }));
  }
  
    async add(s: Lieu_VM, project_id :number):Promise<number> {
    if (!s) {
      throw new BadRequestException('INVALID_LOCATION');
    }
    const objet_base = toLocation(s, project_id);
  
    const objet_insere = await this.location_serv.create(objet_base);
    return objet_insere.id;
  }
  async update(s: Lieu_VM, project_id :number) {
      if (!s) {
      throw new BadRequestException('INVALID_LOCATION');
    }
    const objet_base = toLocation(s, project_id);
  
     await this.location_serv.update(objet_base.id, objet_base);
  
  }
  
  async delete(id: number):Promise<boolean> {
     try{
    await this.location_serv.delete(id);
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