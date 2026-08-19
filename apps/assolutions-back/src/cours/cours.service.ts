import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCoursDto, UpdateCoursDto } from './cours.dto';
import { CoursEntity } from './cours.entity';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';

@Injectable()
export class CoursService {
  constructor(
    @InjectRepository(CoursEntity)
    private readonly repo: Repository<CoursEntity>,
    @InjectRepository(ContratProfEntity)
    private readonly repoContratProf: Repository<ContratProfEntity>,
  ) {}

  listForProject(saisonId: number, projectId: number) {
    return this.repo.find({
      where: { saison_id: saisonId, project_id: projectId },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`cours ${id} introuvable`);
    if (Number(item.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return item;
  }

  async create(dto: CreateCoursDto, projectId: number) {
    const entity = this.repo.create({ ...dto, project_id: projectId });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateCoursDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
