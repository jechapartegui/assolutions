
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { CourseProfessor } from '../entities/cours_professeur.entity';

@Injectable()
export class CourseProfessorService {
  constructor(
    @InjectRepository(CourseProfessor)
    private readonly repo: Repository<CourseProfessor>,
  ) {}

  async get(id: number): Promise<CourseProfessor> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('COURSEPROFESSOR_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<CourseProfessor[]> {
    return this.repo.find();
  }

  async create(data: Partial<CourseProfessor>): Promise<CourseProfessor> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<CourseProfessor>): Promise<CourseProfessor> {
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
