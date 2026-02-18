import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { RegistryService } from '../registry/registry.service';
import { CreateOperationDto, UpdateOperationDto } from './operation.dto';
import { OperationEntity } from './operation.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(OperationEntity) private readonly repo: Repository<OperationEntity>,
    @InjectRepository(FluxFinancierEntity) private readonly fluxRepo: Repository<FluxFinancierEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertFluxInProject(fluxId: number, projectId: number) {
    const flux = await this.fluxRepo.findOne({ where: { id: fluxId } });
    if (!flux) throw new NotFoundException(`flux_financier ${fluxId} introuvable`);
    if (flux.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('o')
      .innerJoin('flux_financier', 'f', 'f.id = o.flux_financier_id')
      .where('f.project_id = :projectId', { projectId })
      .orderBy('o.id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`operation ${id} introuvable`);
    await this.assertFluxInProject(item.flux_financier_id, projectId);
    return item;
  }

  async create(dto: CreateOperationDto, projectId: number) {
    await this.assertFluxInProject(dto.flux_financier_id, projectId);

    const saved = await this.repo.save(this.repo.create(dto as CreateOperationDto));
    await this.registry.ensure('operation', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateOperationDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.flux_financier_id && dto.flux_financier_id !== item.flux_financier_id) {
      await this.assertFluxInProject(dto.flux_financier_id, projectId);
    }

    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    await this.registry.ensure('operation', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    await this.registry.remove('operation', id);
    return { ok: true };
  }
}
