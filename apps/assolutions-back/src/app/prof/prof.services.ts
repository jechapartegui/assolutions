import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { In } from 'typeorm';
import { Adherent } from "../bdd/riders";
import { Professeur } from "../bdd/professeur";
import { professeur, prof } from "@shared/compte/src";
import { SeanceProfesseur } from "../bdd/seance_professeur";
import { ProfesseurSaison } from "../bdd/prof-saison";

@Injectable()
export class ProfService {
  constructor(
    @InjectRepository(Adherent)
    private readonly AdherentRepo: Repository<Adherent>,
    @InjectRepository(Professeur)
    private readonly ProfesseurRepo: Repository<Professeur>,
    @InjectRepository(SeanceProfesseur)
    private readonly SeanceProfesseurRepo: Repository<SeanceProfesseur>,
    @InjectRepository(ProfesseurSaison)
    private readonly ProfesseurSaisonRepo: Repository<ProfesseurSaison>,
  ) {}
  async Get(id: number) {
    const adh = await this.AdherentRepo.findOne({ where: { id } });
    if (!adh) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
      const prof = await this.ProfesseurRepo.findOne({ where: { id } });
    if (!prof) {
      throw new UnauthorizedException('NO_PROF_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    const xd: professeur = this.toprofesseur(adh, prof);
    return xd;
  }

   async GetProfSeance(seance_id: number)  {
    const profs = await this.SeanceProfesseurRepo.find({ where: { seance_id } });
    if (!profs) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
      const prof_rider = await this.AdherentRepo.find({
                where: {
                  id: In(profs.map((prof) => prof.professeur_id)),
                },
              });
    if (!prof_rider) {
      throw new UnauthorizedException('NO_PROF_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return prof_rider.map(adh => this.toprof(adh));
  }
  async GetProfSaison(saison_id: number)  {
    const profs = await this.ProfesseurSaisonRepo.find({ where: { saison_id } });
    if (!profs) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
      const prof_rider = await this.AdherentRepo.find({
                where: {
                  id: In(profs.map((prof) => prof.rider_id)),
                },
              });
    if (!prof_rider) {
      throw new UnauthorizedException('NO_PROF_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return prof_rider.map(adh => this.toprof(adh));
  }

  private toprof(adh: Adherent): prof {
    let p: prof = {
      id: adh.id,
      nom: adh.nom,
      prenom: adh.prenom,
      surnom: adh.surnom,
    };
    return p;
  }

  private toprofesseur(adh: Adherent, pprof: Professeur): professeur {
    let p: professeur = {
      id: adh.id,
      nom: adh.nom,
      prenom: adh.prenom,
      surnom: adh.surnom,
      taux: pprof.taux,
      statut: pprof.statut,
      num_tva: pprof.num_tva,
      num_siren: pprof.num_siren,
      iban: pprof.iban,
      info: pprof.info
    };
    return p;
  }
  
}