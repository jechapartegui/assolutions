
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Session } from '../entities/seance.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async get(id: number): Promise<Session> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('SESSION_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<Session[]> {
    return this.repo.find();
  }

  async create(data: Partial<Session>): Promise<Session> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Session>): Promise<Session> {
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
