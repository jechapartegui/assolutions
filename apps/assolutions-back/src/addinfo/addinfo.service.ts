import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateAddinfoDto, UpdateAddinfoDto } from './addinfo.dto';
import { AddinfoEntity } from './addinfo.entity';

@Injectable()
export class AddinfoService {
  constructor(
    @InjectRepository(AddinfoEntity)
    private readonly repo: Repository<AddinfoEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({
      where: { project_id: projectId },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`addinfo ${id} introuvable`);

    // sécurité stricte : si project_id est null -> interdit (évite fuites “globales”)
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');

    return item;
  }

  async create(dto: CreateAddinfoDto, projectId: number) {
    // on force le project_id depuis le header (même si dto le contient)
    const entity = this.repo.create({ ...dto as CreateAddinfoDto, project_id: projectId } );
    const saved = await this.repo.save(entity);

    await this.registry.ensure('addinfo', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateAddinfoDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId }); // on refixe
    const saved = await this.repo.save(item);

    await this.registry.ensure('addinfo', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('addinfo', id);
    return { ok: true };
  }
}
