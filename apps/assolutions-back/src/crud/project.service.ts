
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Project } from '../entities/projet.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async get(id: number): Promise<Project> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('PROJECT_NOT_FOUND');
    return item;
  }

    async getByLogin(login: string): Promise<Project> {
    const item = await this.repo.findOne({ where: { login } });
    return item;
  }

  async getAll(): Promise<Project[]> {
    return this.repo.find();
  }

  async create(data: Partial<Project>): Promise<Project> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Project>): Promise<Project> {
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
