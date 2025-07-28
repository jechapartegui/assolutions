
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../entities/personne.entity';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
  ) {}

  async get(id: number): Promise<Person | null> {
    const item = await this.repo.findOne({ where: { id } });
    return item;
  }

  

  async getAll(): Promise<Person[]> {
    return this.repo.find();
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
