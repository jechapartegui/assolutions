import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateCoursDto, UpdateCoursDto } from './cours.dto';
import { CoursEntity } from './cours.entity';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';

@Injectable()
export class CoursService {
  constructor(
    @InjectRepository(CoursEntity)
    private readonly repo: Repository<CoursEntity>,
    private readonly registry: RegistryService,

    @InjectRepository(ContratProfEntity)
    private readonly repoContratProf: Repository<ContratProfEntity>,
  ) {}

  listForProject(saison_id: number) {
    return this.repo.find({
      where: { saison_id },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`cours ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  
    return item;
  }

  async create(dto: CreateCoursDto, projectId: number) {
    // sécurité: forcer le project_id depuis le header
    const entity = this.repo.create({ ...dto as CreateCoursDto, project_id: projectId });
    const saved = await this.repo.save(entity);

    await this.registry.ensure('cours', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateCoursDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('cours', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('cours', id);
    return { ok: true };
  }
}
