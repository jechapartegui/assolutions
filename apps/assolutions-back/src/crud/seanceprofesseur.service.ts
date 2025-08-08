
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { SessionProfessor } from '../entities/seance-professeur.entity';

@Injectable()
export class SessionProfessorService {
  constructor(
    @InjectRepository(SessionProfessor)
    private readonly repo: Repository<SessionProfessor>,
  ) {}

  async get(id: number): Promise<SessionProfessor> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('SEANCEPROFESSEUR_NOT_FOUND');
    return item;
  }

    async getAllSeance(seanceId:number): Promise<SessionProfessor[]> {
    return this.repo.find({ where: { seanceId } });
  }

  async getAll(): Promise<SessionProfessor[]> {
    return this.repo.find();
  }

  async create(data: Partial<SessionProfessor>): Promise<SessionProfessor> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      console.warn(err);
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<SessionProfessor>): Promise<SessionProfessor> {
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
