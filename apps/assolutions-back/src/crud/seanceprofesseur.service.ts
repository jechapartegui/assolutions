
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { SeanceProfesseur } from '../entities/seance-professeur.entity';

@Injectable()
export class SeanceProfesseurService {
  constructor(
    @InjectRepository(SeanceProfesseur)
    private readonly repo: Repository<SeanceProfesseur>,
  ) {}

  async get(id: number): Promise<SeanceProfesseur> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('SEANCEPROFESSEUR_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<SeanceProfesseur[]> {
    return this.repo.find();
  }

  async create(data: Partial<SeanceProfesseur>): Promise<SeanceProfesseur> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<SeanceProfesseur>): Promise<SeanceProfesseur> {
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
