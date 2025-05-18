import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
import { Groupe } from '../bdd/groupe';
import { groupe } from '@shared/compte/src/lib/groupe.interface';

@Injectable()
export class GroupeService {
  constructor(
    @InjectRepository(LienGroupe)
    private readonly lienGrouperepo: Repository<LienGroupe>,
    @InjectRepository(Groupe)
    private readonly GroupeRepo: Repository<Groupe>
  ) // @InjectRepository(Projet)
  // private readonly projetRepo: Repository<Projet>,
  {}
  async getGroupe(
    id: number,
    type: 'cours' | 'séance' | 'rider'
  ): Promise<LienGroupe[]> {
    const groupe = await this.lienGrouperepo.find({
      where: { objet_id: id, objet_type: type },
    });
    return groupe;
  }

  async GroupeSaison(saison_id: number): Promise<groupe[]> {
    const gr = await this.GroupeRepo.find({
      where: { saison_id },
    });
    return gr.map((x) => this.togroup(x));
  }
  togroup(gr: Groupe): groupe {
    return {
      id: gr.id,
      nom: gr.nom,
      saison_id: gr.saison_id ?? gr.saison_id ?? 0,
    };
  }
  toGroupe(gr: groupe): Groupe {
  const g = new Groupe();
  g.id = gr.id;
  g.nom = gr.nom;
  g.saison_id = gr.saison_id;
  return g;
}
}
