
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { ProfessorContract } from '../entities/contrat_prof.entity';

@Injectable()
export class ProfessorContractService {
  
  constructor(
    @InjectRepository(ProfessorContract)
    private readonly repo: Repository<ProfessorContract>,
  ) {}
  async getProfessorContractByProfessorId(professorId: number, saisonId: number): Promise<ProfessorContract> {
      const item = await this.repo.findOne({ where: { professorId, saisonId } });
    if (!item) throw new NotFoundException('PROFESSORCONTRACT_NOT_FOUND');
    return item;
  }

  async get(id: number): Promise<ProfessorContract> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('PROFESSORCONTRACT_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<ProfessorContract[]> {
    return this.repo.find();
  }
    async getAllSaison(saisonId:number): Promise<ProfessorContract[]> {
    return this.repo.find({ where: { saisonId }, relations: ['professor', 'professor.person'] });
  }

  async getSeasonProf(saisonId:number, professorId:number): Promise<ProfessorContract | null> {
    return this.repo.findOne({ where: { saisonId, professorId }, relations: ['professor', 'professor.person'] });
  }

  async create(data: Partial<ProfessorContract>): Promise<ProfessorContract> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<ProfessorContract>): Promise<ProfessorContract> {
    await this.get(id);
    try {
      await this.repo.update({ id }, data);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
    return this.get(id);
  }

  async delete(id: number): Promise<void> {
    await this.get(id);
    await this.repo.delete({ id });
  }
}
