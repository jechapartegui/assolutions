
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { InscriptionSaison } from '../entities/inscription-saison.entity';

@Injectable()
export class InscriptionSaisonService {
  constructor(
    @InjectRepository(InscriptionSaison)
    private readonly repo: Repository<InscriptionSaison>,
  ) {}

  async get(id: number): Promise<InscriptionSaison> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('INSCRIPTIONSAISON_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<InscriptionSaison[]> {
    return this.repo.find();
  }

  async create(data: Partial<InscriptionSaison>): Promise<InscriptionSaison> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<InscriptionSaison>): Promise<InscriptionSaison> {
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
