import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Lieu } from "../bdd/lieu";
import { Repository } from "typeorm";
import { lieu } from "@shared/compte/src";

@Injectable()
export class LieuService {
  constructor(
    @InjectRepository(Lieu)
    private readonly LieuRepo: Repository<Lieu>,
  ) {}
  async Get(id: number) {
    const plieu = await this.LieuRepo.findOne({ where: { id } });
    if (!plieu) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    const xd: lieu = this.tolieu(plieu);
      return xd;

  }
  async GetAll(project_id: number) {
    const lieux = await this.LieuRepo.find({ where: { project_id } });
    if (!lieux) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    const xs: lieu[] = lieux.map((plieu) => {
      return this.tolieu(plieu);
    });
    return xs;
  }

  private tolieu(plieu: Lieu): lieu {
    let ad = JSON.parse(plieu.adresse);
    let lieu: lieu = {
      id: plieu.id,
      nom: plieu.nom,
      adresse: ad.name,
      code_postal: ad.postcode,
      ville: ad.city,
    };
    return lieu;
  }
  
}