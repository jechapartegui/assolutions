import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateLieuDto, UpdateLieuDto } from './lieu.dto';
import { LieuEntity } from './lieu.entity';

@Injectable()
export class LieuService {
  constructor(
    @InjectRepository(LieuEntity) private readonly repo: Repository<LieuEntity>,
    private readonly registry: RegistryService,
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
    await this.registry.ensure('lieu', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateLieuDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId, date_maj: new Date() });
    const saved = await this.repo.save(item);
    await this.registry.ensure('lieu', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    await this.registry.remove('lieu', id);
    return { ok: true };
  }
}
