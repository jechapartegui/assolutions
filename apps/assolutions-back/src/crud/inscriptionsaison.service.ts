
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import {  RegistrationSeason } from '../entities/inscription-saison.entity';
import { LinkGroupService } from './linkgroup.service';

@Injectable()
export class RegistrationSeasonService {
  constructor(
    @InjectRepository(RegistrationSeason)
    private readonly repo: Repository<RegistrationSeason>, private linkgroup_serv:LinkGroupService
  ) {}

  async get(id: number): Promise<RegistrationSeason> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('REGISTRATION_SEASON_NOT_FOUND');
    item.groups = await this.linkgroup_serv.getGroupsForObject('rider', id);
    return item;
  }

async getPersonRegistrations( personneId: number,
  projectId: number): Promise<RegistrationSeason[]> {
    let courses = await this.repo.find({ relations: ['saison'],   // pour pouvoir filtrer sur season.projectId
    where: {
      personneId,
      saison: {
        projectId: projectId,
      },
    },});
    // pour chaque cours, on va chercher ses liens “cours”
    return Promise.all(
      courses.map(async course => {
        course.groups = await this.linkgroup_serv.getGroupsForObject('rider', course.id);
        return course;
      })
    );
  }

  async getAllSeason( saisonId: number): Promise<RegistrationSeason[]> {
    let courses = await this.repo.find({    // pour pouvoir filtrer sur season.projectId
    where: {
      saisonId
    },});
    // pour chaque cours, on va chercher ses liens “cours”
    return Promise.all(
      courses.map(async course => {
        course.groups = await this.linkgroup_serv.getGroupsForObject('rider', course.id);
        return course;
      })
    );
  }
    async getAllSeasonRider( saisonId: number, personneId:number): Promise<RegistrationSeason> {
    let item = await this.repo.findOne({    // pour pouvoir filtrer sur season.projectId
    where: {
      saisonId, personneId
    },});
    // pour chaque cours, on va chercher ses liens “cours”
    if (!item) throw new NotFoundException('REGISTRATION_SEASON_NOT_FOUND');
    item.groups = await this.linkgroup_serv.getGroupsForObject('rider', personneId);
    return item;
  }


  async getAll(): Promise<RegistrationSeason[]> {
    return this.repo.find();
  }

  async create(data: Partial<RegistrationSeason>): Promise<RegistrationSeason> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<RegistrationSeason>): Promise<RegistrationSeason> {
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
