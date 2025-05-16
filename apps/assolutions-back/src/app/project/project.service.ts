import {
    Injectable,
    UnauthorizedException
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {  Repository } from 'typeorm';
  import { Saison } from '../bdd/saison';
  
  
  @Injectable()
  export class ProjectService {
  
    constructor(
      @InjectRepository(Saison)
    private readonly saisonRepo: Repository<Saison>,
  
   
    // @InjectRepository(Projet)
    // private readonly projetRepo: Repository<Projet>,
    ) {
    }

    async numberActiveSaison(project_id: number): Promise<number>{
      return (await this.getActiveSaion(project_id)).id;
    }
  
    async getActiveSaion(project_id: number): Promise<Saison> {
      const saison = await this.saisonRepo.findOne({
          where: {
            project_id: project_id,
            active: true,
          },
        });
      if (!saison) {
        throw new UnauthorizedException ('NO_SEASON_FOUND');
      } else {
          return saison;
      }
  }

  async IsSaisonActive(id: number): Promise<Saison | null> {
    const saison = await this.saisonRepo.findOne({
        where: {
          id: id,
          active: true,
        },
      });
    return saison;
}
  
    
    }