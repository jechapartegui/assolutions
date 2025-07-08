
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { InscriptionSeance } from '../entities/inscription-seance.entity';

@Injectable()
export class InscriptionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeance)
    private readonly repo: Repository<InscriptionSeance>,
  ) {}

  async get(id: number): Promise<InscriptionSeance> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('INSCRIPTIONSEANCE_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<InscriptionSeance[]> {
    return this.repo.find();
  }

  async create(data: Partial<InscriptionSeance>): Promise<InscriptionSeance> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<InscriptionSeance>): Promise<InscriptionSeance> {
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
