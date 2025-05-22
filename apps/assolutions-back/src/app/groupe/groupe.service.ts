import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
import { Groupe } from '../bdd/groupe';
import { KeyValuePair } from '@shared/compte/src';

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
  async getGroupeObjet(
    id: number,
    type: 'cours' | 'séance' | 'rider'
  ): Promise<LienGroupe[]> {
    const groupe = await this.lienGrouperepo.find({
      where: { objet_id: id, objet_type: type },
    });
    return groupe;
  }
  async Get(id: number): Promise<KeyValuePair> {
    const gr = await this.GroupeRepo.findOne({
      where: { id },
    });
     if (!gr) {
        throw new BadRequestException('NO_GROUP_FOUND');
      }
      return {
        key: gr.id,
        value: gr.nom,
      };
  }


  async GetAll(saison_id: number): Promise<KeyValuePair[]> {
    const gr = await this.GroupeRepo.find({
      where: { saison_id },
    });
     if (!gr) {
        throw new BadRequestException('NO_GROUP_FOUND');
      }
    return gr.map((x) => { 
      return {
        key: x.id,
        value: x.nom,
      };
    });
  }

    async Add(s: KeyValuePair, saison_id :number) {
      if (!s) {
        throw new BadRequestException('INVALID_GROUP');
      }
      const objet_base = this.toGroupe(s, saison_id);
    
      const newISS = this.GroupeRepo.create(objet_base);
      const saved = await this.GroupeRepo.save(newISS);
      return saved.id;
    }
    async Update(s: KeyValuePair, saison_id :number) {
      if (!s) {
        throw new BadRequestException('INVALID_GROUP');
      }
      const objet_base = this.toGroupe(s, saison_id);
    
      const existing = await this.GroupeRepo.findOne({ where: { id: Number(s.key) } });
      if (!existing) {
        throw new NotFoundException('NO_GROUP_FOUND');
      }
    
      const updated = await this.GroupeRepo.save({ ...existing, ...objet_base });
      if(updated) {
        return true;
      } else {
        return false
      }
    }
    
    
    async Delete(id: number) {
      const toDelete = await this.GroupeRepo.findOne({ where: { id } });
      if (!toDelete) {
        throw new NotFoundException('NO_GROUP_FOUND');
      }
    
      await this.GroupeRepo.remove(toDelete);
      return { success: true };
    }
    async AddLien(
      id_objet: number,
      type_objet: string,
      id_groupe: number
    ): Promise<number> {
      const newLien = this.lienGrouperepo.create({
        objet_id: id_objet,
        objet_type: type_objet,
        groupe_id: id_groupe,
      });
      return (await this.lienGrouperepo.save(newLien)).id;
    }
    async DeleteLien(
      id_objet: number,
      type_objet: string,
      id_groupe: number
    ): Promise<boolean> {
      const lien = await this.lienGrouperepo.findOne({
        where: { objet_id: id_objet, objet_type: type_objet, groupe_id: id_groupe },
      });
      if (!lien) {
        throw new NotFoundException('NO_LINK_FOUND');
      }
      await this.lienGrouperepo.remove(lien);
      return true;
    }

  toGroupe(gr: KeyValuePair, saison_id:number): Groupe {
  const g = new Groupe();
  g.id = Number(gr.key);
  g.nom = gr.value;
  g.saison_id = saison_id;
  return g;
}
}
