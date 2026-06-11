import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { CreateLieuDto, UpdateLieuDto } from './lieu.dto';
import { LieuEntity } from './lieu.entity';

@Injectable()
export class LieuService {
  constructor(
    @InjectRepository(LieuEntity) private readonly repo: Repository<LieuEntity>,
    
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({ where: { project_id: projectId }, order: { id: 'ASC' } });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`lieu ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateLieuDto, projectId: number) {
    const saved = await this.repo.save(this.repo.create({ ...dto as CreateLieuDto, project_id: projectId }));
    return saved;
  }

  async update(id: number, dto: UpdateLieuDto, projectId: number) {
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

  async search(query: string, projectId: number) {
    return this.repo.find({
      where: {
        project_id: projectId,
        nom: ILike(`%${query}%`),
      },
      order: { id: 'ASC' },
    });
  }
}
