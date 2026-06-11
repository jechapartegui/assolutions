import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProfesseurDto, UpdateProfesseurDto } from './professeur.dto';
import { ProfesseurEntity } from './professeur.entity';

@Injectable()
export class ProfesseurService {
  constructor(
    @InjectRepository(ProfesseurEntity) private readonly repo: Repository<ProfesseurEntity>,
    
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({ where: { project_id: projectId }, order: { id: 'ASC' } });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`professeur ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateProfesseurDto, projectId: number) {
    const saved = await this.repo.save(this.repo.create({ ...dto as CreateProfesseurDto, project_id: projectId } ));
    return saved;
  }

  async update(id: number, dto: UpdateProfesseurDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId, date_maj: new Date() });
    const saved = await this.repo.save(item);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
