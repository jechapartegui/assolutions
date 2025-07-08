
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Professor } from '../entities/professeur.entity';

@Injectable()
export class ProfessorService {
  constructor(
    @InjectRepository(Professor)
    private readonly repo: Repository<Professor>,
  ) {}

  async get(id: number): Promise<Professor> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('PROFESSOR_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<Professor[]> {
    return this.repo.find();
  }

  async create(data: Partial<Professor>): Promise<Professor> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Professor>): Promise<Professor> {
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
