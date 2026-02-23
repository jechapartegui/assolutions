import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectEntity } from './project.entity';


@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
    private readonly registry: RegistryService,
  ) {}
  

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`project ${id} introuvable`);
    return item;
  }

  async create(dto: CreateProjectDto) {
    const entity = this.repo.create(dto as CreateProjectDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('project', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateProjectDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('project', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    await this.registry.remove('project', id);
    return { ok: true };
  }
  async isAdminOnProject(userId: number, projectId: number): Promise<boolean> {
    const project = await this.repo.findOne({
      where: { id: projectId },
      select: { id: true, compte_id: true } as any, // selon ton entity
    });

    if (!project) return false;

    // adapte le nom du champ selon ton entity :
    // - compte_id
    // - compteId
    // - owner_compte_id
    return (project as any).compte_id === userId || (project as any).compteId === userId;
  }
}
