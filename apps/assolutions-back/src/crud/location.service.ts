
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Location } from '../entities/lieu.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  async get(id: number): Promise<Location> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('LOCATION_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<Location[]> {
    return this.repo.find();
  }

  async create(data: Partial<Location>): Promise<Location> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Location>): Promise<Location> {
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
