
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professor } from '../entities/professeur.entity';

@Injectable()
export class ProfessorService {
  constructor(
    @InjectRepository(Professor)
    private readonly repo: Repository<Professor>,
  ) {}

  async get(id: number): Promise<Professor | null> {
    const item = await this.repo.findOne({ where: { id },
   
 relations: [
      'person',
      'contracts',
      'contracts.saison',        
      'contracts.saison.project',    
    ], });
    return item;
  }

  async getAll(projectId:number): Promise<Professor[]> {
    return await this.repo.find({
  where: { projectId },                      // ou { projectId }
  relations: { person: true, project: true, contracts:true },
});

  }

  async create(data: Partial<Professor>): Promise<Professor> {
      const entity = this.repo.create(data);
      // si save lance QueryFailedError, on ne l’attrape pas ici
      return this.repo.save(entity);
    }
  
    async update(id: number, data: Partial<Professor>): Promise<Professor> {
      const entity = await this.get(id);
      if (!entity) throw new NotFoundException('PROFESSOR_NOT_FOUND');
      Object.assign(entity, data);
      return this.repo.save(entity);
    }
  
    async delete(id: number): Promise<void> {
      const entity = await this.get(id);
      if (!entity) throw new NotFoundException('PROFESSOR_NOT_FOUND');
      await this.repo.remove(entity);
    }


}
