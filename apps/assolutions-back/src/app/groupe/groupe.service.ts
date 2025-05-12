import {
    Injectable
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {  Repository } from 'typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
  
  
  @Injectable()
  export class GroupeService {
  
    constructor(
    @InjectRepository(LienGroupe)
  private readonly lienGrouperepo: Repository<LienGroupe>,
  
   
    // @InjectRepository(Projet)
    // private readonly projetRepo: Repository<Projet>,
    ) {
    }
    async getGroupe(id:number, type : "cours" | "séance" | "rider"): Promise<LienGroupe[]> {
        const groupe = await this.lienGrouperepo.find({ where: { objet_id : id, objet_type:type } });
        return groupe;
    }
}