import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateSaisonDto, UpdateSaisonDto } from './saison.dto';
import { SaisonEntity } from './saison.entity';

@Injectable()
export class SaisonService {
  constructor(
    @InjectRepository(SaisonEntity)
    private readonly repo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({
      where: { project_id: projectId },
      order: { id: 'ASC' },
    });
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`saison ${id} introuvable`);
    return item;
  }

  async create(dto: CreateSaisonDto, projectId: number) {
    const entity = this.repo.create({ ...dto, project_id: projectId });
    const saved = await this.repo.save(entity);

    await this.registry.ensure('saison', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateSaisonDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('saison', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    await this.registry.remove('saison', id);
    return { ok: true };
  }
}
