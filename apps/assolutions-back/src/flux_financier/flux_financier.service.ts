import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateFluxFinancierDto, UpdateFluxFinancierDto } from './flux_financier.dto';
import { FluxFinancierEntity } from './flux_financier.entity';

@Injectable()
export class FluxFinancierService {
  constructor(
    @InjectRepository(FluxFinancierEntity) private readonly repo: Repository<FluxFinancierEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({ where: { project_id: projectId }, order: { id: 'ASC' } });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`flux_financier ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateFluxFinancierDto, projectId: number) {
    const saved = await this.repo.save(this.repo.create({ ...dto as CreateFluxFinancierDto, project_id: projectId }));
    await this.registry.ensure('flux_financier', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateFluxFinancierDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId });
    const saved = await this.repo.save(item);
    await this.registry.ensure('flux_financier', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    await this.registry.remove('flux_financier', id);
    return { ok: true };
  }
}
