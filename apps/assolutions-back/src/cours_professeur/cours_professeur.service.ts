import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CoursEntity } from '../cours/cours.entity';
import { CreateCoursProfesseurDto, UpdateCoursProfesseurDto } from './cours_professeur.dto';
import { CoursProfesseurEntity } from './cours_professeur.entity';

@Injectable()
export class CoursProfesseurService {
  constructor(
    @InjectRepository(CoursProfesseurEntity) private readonly repo: Repository<CoursProfesseurEntity>,
    @InjectRepository(CoursEntity) private readonly coursRepo: Repository<CoursEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertCoursInProject(coursId: number, projectId: number) {
    const cours = await this.coursRepo.findOne({ where: { id: coursId } });
    if (!cours) throw new NotFoundException(`cours ${coursId} introuvable`);
    if (cours.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('cp')
      .innerJoin('cours', 'c', 'c.id = cp.cours_id')
      .where('c.project_id = :projectId', { projectId })
      .orderBy('cp.id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`cours_professeur ${id} introuvable`);
    await this.assertCoursInProject(item.cours_id, projectId);
    return item;
  }

  async create(dto: CreateCoursProfesseurDto, projectId: number) {
    await this.assertCoursInProject(dto.cours_id, projectId);

    const saved = await this.repo.save(this.repo.create(dto as CreateCoursProfesseurDto));
    await this.registry.ensure('cours_professeur', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateCoursProfesseurDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.cours_id && dto.cours_id !== item.cours_id) {
      await this.assertCoursInProject(dto.cours_id, projectId);
    }

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('cours_professeur', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('cours_professeur', id);
    return { ok: true };
  }
}
