import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CompteBancaireEntity } from './compte_bancaire.entity';
import { CreateCompteBancaireDto, UpdateCompteBancaireDto } from './compte_bancaire.dto';

@Injectable()
export class CompteBancaireService {
  constructor(
    @InjectRepository(CompteBancaireEntity)
    private readonly repo: Repository<CompteBancaireEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({ where: { project_id: projectId }, order: { id: 'ASC' } });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`compte_bancaire ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateCompteBancaireDto, projectId: number) {
    const entity = this.repo.create({ ...dto as CreateCompteBancaireDto, project_id: projectId });
    const saved = await this.repo.save(entity);

    await this.registry.ensure('compte_bancaire', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateCompteBancaireDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId });
    const saved = await this.repo.save(item);

    await this.registry.ensure('compte_bancaire', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('compte_bancaire', id);
    return { ok: true };
  }
}
