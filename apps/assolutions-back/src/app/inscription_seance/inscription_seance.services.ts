import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { InscriptionSeance } from "../bdd/inscription-seance";
import { SeanceService } from "../seance/seance.services";
import { MemberService } from "../member/member.services";
import { adherent } from "@shared/src/lib/member.interface";
import { full_inscription_seance, inscription_seance } from "@shared/src/lib/inscription_seance.interface";

@Injectable()
//   this.url = 'api/inscription_seance/get/' + id;
//  this.url = 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = 'api/inscription_seance/add';
//     this.url = 'api/inscription_seance/update';
//  this.url = 'api/inscription_seance/delete/' + id;
export class InscriptionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeance)
    private readonly InscriptionSeanceRepo: Repository<InscriptionSeance>,
    private seance_serv :SeanceService,
    private member_serv: MemberService
  ) {}

  async Get(id: number) {
    const pISS = await this.InscriptionSeanceRepo.findOne({ where: { id } });
    if (!pISS) {
      throw new UnauthorizedException('NO_REGISTRATION_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.toISS(pISS);

  }
   async GetFull(id: number) {
    const pISS = await this.InscriptionSeanceRepo.findOne({ where: { id } });
    if (!pISS) {
      throw new UnauthorizedException('NO_REGISTRATION_FOUND');
    }
       const pAdh = await this.member_serv.GetMyInfo(pISS.rider_id);
    if (!pAdh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.toISSFull(pISS, pAdh);

  }
   async GetAllRiderSaison(rider_id: number, saison_id:number) {
    const seance_ids = (await this.seance_serv.GetSeanceSaison(saison_id)).map(x => x.seance_id);
    const pISSs = await this.InscriptionSeanceRepo.find({ where: { seance_id: In(seance_ids), rider_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_REGISTRATION_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
      return pISSs.map((plieu) => {
      return this.toISS(plieu);
    });

  }
   async GetAllSeance(seance_id:number) {
    const pISSs = await this.InscriptionSeanceRepo.find({ where: { seance_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_REGISTRATION_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
       return pISSs.map((plieu) => {
      return this.toISS(plieu);
    });

  }

  async Add(inscription: inscription_seance) {
  if (!inscription) {
    throw new BadRequestException('INVALID_REGISTRATION');
  }
  const objet_base = this.fromISS(inscription);

  const newISS = this.InscriptionSeanceRepo.create(objet_base);
  const saved = await this.InscriptionSeanceRepo.save(newISS);
  return this.toISS(saved).id;
}
async Update(inscription: inscription_seance) {
  if (!inscription || !inscription.id) {
    throw new BadRequestException('INVALID_REGISTRATION_ID');
  }

  const existing = await this.InscriptionSeanceRepo.findOne({ where: { id: inscription.id } });
  if (!existing) {
    throw new NotFoundException('REGISTRATION_NOT_FOUND');
  }
  const objet_base = this.fromISS(inscription);

  const updated = await this.InscriptionSeanceRepo.save({ ...existing, ...objet_base });
  return this.toISS(updated);
}

async Delete(id: number) {
  const toDelete = await this.InscriptionSeanceRepo.findOne({ where: { id } });
  if (!toDelete) {
    throw new NotFoundException('REGISTRATION_NOT_FOUND');
  }

  await this.InscriptionSeanceRepo.remove(toDelete);
  return { success: true };
}





  private toISS(piss: InscriptionSeance): inscription_seance {
    let lieu: inscription_seance = {
      id: piss.id,
      rider_id:piss.rider_id,
           seance_id: piss.seance_id,
           date_inscription: piss.date_inscription,
           statut_inscription: piss.statut_inscription || undefined,
           statut_seance: piss.statut_seance || undefined,
      
    };
    return lieu;
  }
    private toISSFull(piss: InscriptionSeance, pAdh:adherent): full_inscription_seance {
    let lieu: full_inscription_seance = {
      id: piss.id,
      rider_id:piss.rider_id,
           seance_id: piss.seance_id,
           date_inscription: piss.date_inscription,
           statut_inscription: piss.statut_inscription || undefined,
           statut_seance: piss.statut_seance || undefined,
           nom : pAdh.nom,
          prenom : pAdh.prenom,
          surnom : pAdh.surnom,
          contacts: pAdh.contact,
          contacts_prevenir : pAdh.contact_prevenir      
    };
    return lieu;
  }
private fromISS(pIns: inscription_seance): InscriptionSeance {
  const entity = new InscriptionSeance();
  entity.id = pIns.id;
  entity.rider_id = pIns.rider_id;
  entity.seance_id = pIns.seance_id;
  entity.date_inscription = pIns.date_inscription;

  // En supposant que tes enums sont des strings dans la base
  // Mappage enum inverse sécurisé
  entity.statut_inscription = this.fromStatutPresence(pIns.statut_inscription) || undefined;
  entity.statut_seance = this.fromStatutPresenceSeance(pIns.statut_seance)|| undefined;

  return entity;
}

 
private fromStatutPresence(statut?: string): "présent" | "absent" | "convoqué" | "essai" | undefined {
  switch (statut) {
    case "présent":
      return "présent";
    case "absent":
      return "absent";
    case "essai":
      return "essai";
    case "convoqué":
      return "convoqué";
    default:
      return undefined;
  }
}
  private fromStatutPresenceSeance(statut?: string): "présent" | "absent" | undefined {
  switch (statut) {
    case "présent":
      return "présent";
    case "absent":
      return "absent";
    default:
      return undefined;
  }
}
  
}