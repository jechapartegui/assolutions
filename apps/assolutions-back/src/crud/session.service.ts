
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Session } from '../entities/seance.entity';
import { LinkGroupService } from './linkgroup.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>, private linkgroup_serv:LinkGroupService
  ) {}

  async get(id: number): Promise<Session> {
    const item = await this.repo.findOne({ where: { id }, relations: ['course', 'location', 'seanceProfesseurs', 'seanceProfesseurs.professeur', 'seanceProfesseurs.professeur.professor', 'seanceProfesseurs.professeur.professor.person'] });
    if (!item) throw new NotFoundException('SESSION_NOT_FOUND');
      item.groups = await this.linkgroup_serv.getGroupsForObject('séance', id);
    return item;
  }

  async getAll(): Promise<Session[]> {
    const seances = await this.repo.find();
     return Promise.all(
      seances.map(async seance => {
        seance.groups = await this.linkgroup_serv.getGroupsForObject('séance', seance.id);
        return seance;
      })
    );
  }
    async getAllSeason(seasonId:number): Promise<Session[]> {
     const seances = await  this.repo.find({ where: { seasonId }, relations: ['course', 'location', 'seanceProfesseurs', 'seanceProfesseurs.professeur', 'seanceProfesseurs.professeur.professor', 'seanceProfesseurs.professeur.professor.person'] });
     return Promise.all(
      seances.map(async seance => {
        seance.groups = await this.linkgroup_serv.getGroupsForObject('séance', seance.id);
        return seance;
      })
    );
  }

      async getAllPublic(seasonId:number): Promise<Session[]> {
     return await  this.repo.find({ where: { seasonId }, relations: ['course', 'location', 'seanceProfesseurs', 'seanceProfesseurs.professeur', 'seanceProfesseurs.professeur.professor', 'seanceProfesseurs.professeur.professor.person'] });
     
  }


  async create(data: Partial<Session>): Promise<Session> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      console.warn(err);
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
