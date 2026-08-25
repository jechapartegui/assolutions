import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
  ) {}

  async list() {
    const items = await this.repo.find();
    return items.map((item) => this.sanitize(item));
  }

  async listPublicProjects() {
    const items = await this.repo.find({ where: { public: true, actif: true } });
    return items.map((item) => this.sanitize(item));
  }

  async getPublic(id: number) {
    const item = await this.repo.findOne({
      where: { id, public: true, actif: true },
    });
    if (!item) throw new NotFoundException('PROJECT_NOT_FOUND');
    return this.sanitize(item);
  }

  async get(id: number) {
    return this.sanitize(await this.getEntity(id));
  }

  async create(dto: CreateProjectDto) {
    const entity = this.repo.create(dto as CreateProjectDto);
    return this.sanitize(await this.repo.save(entity));
  }

  async update(id: number, dto: UpdateProjectDto) {
    const item = await this.getEntity(id);
    Object.assign(item, dto, { date_maj: new Date() });
    return this.sanitize(await this.repo.save(item));
  }

  async remove(id: number) {
    const item = await this.getEntity(id);
    await this.repo.remove(item);
    return { ok: true };
  }

  async isAdminOnProject(userId: number, projectId: number): Promise<boolean> {
    const project = await this.repo.findOne({ where: { id: projectId } });
    return !!project && Number(project.compte) === Number(userId);
  }

  private async getEntity(id: number): Promise<ProjectEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`project ${id} introuvable`);
    return item;
  }

  private sanitize(item: ProjectEntity): ProjectEntity {
    return {
      ...item,
      password: '',
      activation_token: null,
    } as ProjectEntity;
  }
}
