import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateCoursDto, UpdateCoursDto } from './cours.dto';
import { CoursEntity } from './cours.entity';

@Injectable()
export class CoursService {
  constructor(
    @InjectRepository(CoursEntity)
    private readonly repo: Repository<CoursEntity>,
    @InjectRepository(ContratProfEntity)
    private readonly repoContratProf: Repository<ContratProfEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
  ) {}

  private async assertSeasonInProject(saisonId: number, projectId: number): Promise<void> {
    const season = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!season) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(season.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
  }

  async listForProject(saisonId: number, projectId: number) {
    await this.assertSeasonInProject(saisonId, projectId);
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
    await this.assertSeasonInProject(dto.saison_id, projectId);
    const entity = this.repo.create({
      ...(dto as CreateCoursDto),
      project_id: projectId,
    });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateCoursDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.saison_id && Number(dto.saison_id) !== Number(item.saison_id)) {
      await this.assertSeasonInProject(dto.saison_id, projectId);
    }

    Object.assign(item, dto, {
      project_id: projectId,
      date_maj: new Date(),
    });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
