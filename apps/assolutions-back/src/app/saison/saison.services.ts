import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Saison } from "../bdd/saison";
import { saison } from "@shared/compte/src/lib/saison.interface";
import { KeyValuePair } from "@shared/compte/src/lib/autres.interface";

@Injectable()
//   this.url = 'api/inscription_seance/get/' + id;
//  this.url = 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = 'api/inscription_seance/add';
//     this.url = 'api/inscription_seance/update';
//  this.url = 'api/inscription_seance/delete/' + id;
export class SaisonService {
  constructor(
    @InjectRepository(Saison)
    private readonly SaisonRepo: Repository<Saison>
  ) {}

  async Get(id: number) {
    const sS = await this.SaisonRepo.findOne({ where: { id } });
    if (!sS) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.to_saison(sS);

  }

   async GetAll(project_id:number) {
    const pISSs = await this.SaisonRepo.find({ where: { project_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return pISSs.map((plieu) => {
      return this.to_saison(plieu);
    });

  }
  async GetAllLight(project_id:number) {
    const pISSs = await this.SaisonRepo.find({ where: { project_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_SEASON_FOUND');
    }
 return pISSs.map((plieu): KeyValuePair => {
  return {
    key: plieu.id,
    value: plieu.nom
  };
});


  }

  async Add(s: saison, project_id :number) {
  if (!s) {
    throw new BadRequestException('INVALID_SEASON');
  }
  const objet_base = this.toSaison(s, project_id);

  const newISS = this.SaisonRepo.create(objet_base);
  const saved = await this.SaisonRepo.save(newISS);
  return this.to_saison(saved).id;
}
async Update(s: saison, project_id :number) {
  if (!s) {
    throw new BadRequestException('INVALID_SEASON');
  }
  const objet_base = this.toSaison(s, project_id);

  const existing = await this.SaisonRepo.findOne({ where: { id: s.id } });
  if (!existing) {
    throw new NotFoundException('SEASON_NOT_FOUND');
  }

  const updated = await this.SaisonRepo.save({ ...existing, ...objet_base });
  return this.to_saison(updated);
}

async Delete(id: number) {
  const toDelete = await this.SaisonRepo.findOne({ where: { id } });
  if (!toDelete) {
    throw new NotFoundException('SEASON_NOT_FOUND');
  }

  await this.SaisonRepo.remove(toDelete);
  return { success: true };
}


toSaison(data: saison, project_id: number): Saison {
  const s = new Saison();
  s.id = data.id;
  s.nom = data.nom;
  s.active = data.active;
  s.date_debut = data.date_debut;
  s.date_fin = data.date_fin;
  s.project_id = project_id;
  return s;
}
to_saison(entity: Saison): saison {
  return {
    id: entity.id,
    nom: entity.nom,
    active: entity.active,
    date_debut: entity.date_debut,
    date_fin: entity.date_fin
  };
}

  
}