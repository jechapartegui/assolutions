
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../entities/personne.entity';
import { LinkGroupService } from './linkgroup.service';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
    private linkgroup_serv: LinkGroupService,
  ) {}

  async get(id: number): Promise<Person | null> {
    const item = await this.repo.findOne({ where: { id } });
    return item;
  }

  

 async getAllSaison(saisonId: number): Promise<Person[]> {
  const personnes = await this.repo.find({
    relations: ['account', 'inscriptions', 'inscriptions.saison'],
    where: {
      inscriptions: {
        saisonId: saisonId,
      },
    },
  });

  // Remplir les groupes pour chaque inscription de chaque personne
  for (const personne of personnes) {
    if(personne.inscriptions) {
    for (const inscription of personne.inscriptions) {
      inscription.groups = await this.linkgroup_serv.getGroupsForObject('rider', personne.id);
    }
  }
  }

  return personnes;
}

    async getAllCompte(accountId : number): Promise<Person[]> {
    return this.repo.find({ where: { accountId } });
  }
   

    async create(data: Partial<Person>): Promise<Person> {
        const entity = this.repo.create(data);
        // si save lance QueryFailedError, on ne l’attrape pas ici
        return this.repo.save(entity);
      }
    
      async update(id: number, data: Partial<Person>): Promise<Person> {
        const entity = await this.get(id);
        if (!entity) throw new NotFoundException('PERSON_NOT_FOUND');
        Object.assign(entity, data);
        return this.repo.save(entity);
      }
    
      async delete(id: number): Promise<void> {
        const entity = await this.get(id);
        if (!entity) throw new NotFoundException('PERSON_NOT_FOUND');
        await this.repo.remove(entity);
      }
}
