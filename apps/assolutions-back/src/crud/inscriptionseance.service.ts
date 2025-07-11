
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { RegistrationSession } from '../entities/inscription-seance.entity';

@Injectable()
export class RegistrationSessionService {
  constructor(
    @InjectRepository(RegistrationSession)
    private readonly repo: Repository<RegistrationSession>,
  ) {}

  async get(id: number): Promise<RegistrationSession> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('REGISTRATION_SESSION_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<RegistrationSession[]> {
    return this.repo.find();
  }
    async getAllSeance(seanceId:number): Promise<RegistrationSession[]> {
    return this.repo.find({ where: { seanceId } });
  }
    async getAllRiderSaison(personId:number,seasonId:number ): Promise<RegistrationSession[]> {
  return this.repo.find({
    relations: ['seance'],            // charge la relation
    where: {
      personId,              // ton champ personne_id
      seance: {
        seasonId            // la propriété de l’entité Session
      }
    }
  });
}

  async create(data: Partial<RegistrationSession>): Promise<RegistrationSession> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<RegistrationSession>): Promise<RegistrationSession> {
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
