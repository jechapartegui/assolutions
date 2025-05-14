import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InscriptionSeance } from "../bdd/inscription-seance";
import { inscription_seance, StatutPresence } from "@shared/compte/src";

@Injectable()
//   this.url = 'api/inscription_seance/get/' + id;
//  this.url = 'api/inscription_seance/get_full/' + id;
//   this.url = 'api/inscription_seance/get_all_cours/' + cours_id;
//   this.url = 'api/inscription_seance/get_all_rider/' + rider_id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = 'api/inscription_seance/add';
//     this.url = 'api/inscription_seance/update';
//  this.url = 'api/inscription_seance/delete/' + id;
export class InscritpionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeance)
    private readonly InscriptionSeanceRepo: Repository<InscriptionSeance>,
  ) {}

  async Get(id: number) {
    const plieu = await this.InscriptionSeanceRepo.findOne({ where: { id } });
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

  private toISS(piss: InscriptionSeance): inscription_seance {
    let lieu: inscription_seance = {
      id: piss.id,
      rider_id:piss.rider_id,
           seance_id: piss.seance_id,
           date_inscription: piss.date_inscription,
           statut_inscription: this.toStatutPresence(piss.statut_inscription),
           statut_seance: piss.statut_seance,
      
    };
    return lieu;
  }

 toStatutPresence(str: string): StatutPresence | null {
  switch (str?.toLowerCase()) {
    case "présent":
      return StatutPresence.Présent;
    case "absent":
      return StatutPresence.Absent;
    case "essai":
      return StatutPresence.Essai;
    case "convoqué":
      return StatutPresence.Convoqué;
    default:
      return null;
  }
}
  
  
}