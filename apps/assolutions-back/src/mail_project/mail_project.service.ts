import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateMailProjectDto, UpdateMailProjectDto } from './mail_project.dto';
import { MailProjectEntity } from './mail_project.entity';

@Injectable()
export class MailProjectService {
  constructor(
    @InjectRepository(MailProjectEntity) private readonly repo: Repository<MailProjectEntity>,
    private readonly registry: RegistryService,
  ) {}

  async get(projectId: number) {
    const item = await this.repo.findOne({ where: { id: projectId } });
    if (!item) throw new NotFoundException(`mail_project ${projectId} introuvable`);
    return item;
  }

  async upsert(projectId: number, dto: CreateMailProjectDto | UpdateMailProjectDto) {
    const existing = await this.repo.findOne({ where: { id: projectId } });
    const entity = existing ? Object.assign(existing, dto) : this.repo.create({ id: projectId, ...dto  as CreateMailProjectDto});
    const saved = await this.repo.save(entity);

    await this.registry.ensure('mail_project', projectId);
    return saved;
  }

  async remove(projectId: number) {
    const item = await this.get(projectId);
    await this.repo.remove(item);

    await this.registry.remove('mail_project', projectId);
    return { ok: true };
  }
}
