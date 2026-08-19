import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccessControlService } from '../common/access-control.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
    private readonly access: AccessControlService,
  ) {}

  async list() {
    const items = await this.repo.find();
    return items.map((item) => this.hideSensitiveData(item));
  }

  async listPublicProjects() {
    const items = await this.repo.find({ where: { public: true, actif: true } });
    return items.map((item) => this.hideSensitiveData(item));
  }

  async getAuthorized(id: number, requesterId: number) {
    const item = await this.access.assertProjectAccess(requesterId, id);
    return this.hideSensitiveData(item);
  }

  async create(dto: CreateProjectDto, requesterId: number) {
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        compte: requesterId,
      }),
    );
    return this.hideSensitiveData(saved);
  }

  async update(id: number, dto: UpdateProjectDto, requesterId: number) {
    const item = await this.access.assertProjectAdmin(requesterId, id);
    Object.assign(item, dto, { date_maj: new Date() });
    return this.hideSensitiveData(await this.repo.save(item));
  }

  async remove(id: number, requesterId: number) {
    const item = await this.access.assertProjectAdmin(requesterId, id);
    await this.repo.remove(item);
    return { ok: true };
  }

  async isAdminOnProject(userId: number, projectId: number): Promise<boolean> {
    try {
      await this.access.assertProjectAdmin(userId, projectId);
      return true;
    } catch {
      return false;
    }
  }

  private hideSensitiveData(project: ProjectEntity): ProjectEntity {
    return {
      ...project,
      password: '',
      activation_token: null,
    };
  }
}
