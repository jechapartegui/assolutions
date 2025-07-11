
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Season } from '../entities/saison.entity';

@Injectable()
export class SeasonService {
  constructor(
    @InjectRepository(Season)
    private readonly repo: Repository<Season>,
  ) {}

  async get(id: number): Promise<Season> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('SEASON_NOT_FOUND');
    return item;
  }
    async getActive(projectId:number): Promise<Season> {
    const item = await this.repo.findOne({ where: { projectId, isActive:true } });
    if (!item) throw new NotFoundException('SEASON_NOT_FOUND');
    return item;
  }

  async getAll(projectId:number): Promise<Season[]> {
    return this.repo.find({ where: { projectId } });
  }

  async create(data: Partial<Season>): Promise<Season> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Season>): Promise<Season> {
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
