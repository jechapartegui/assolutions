import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CoursEntity } from '../cours/cours.entity';
import { CreateCoursProfesseurDto, UpdateCoursProfesseurDto } from './cours_professeur.dto';
import { CoursProfesseurEntity } from './cours_professeur.entity';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';

@Injectable()
export class CoursProfesseurService {
  constructor(
    @InjectRepository(CoursProfesseurEntity) private readonly repo: Repository<CoursProfesseurEntity>,
    @InjectRepository(CoursEntity) private readonly coursRepo: Repository<CoursEntity>,
    @InjectRepository(ContratProfEntity) private readonly contratRepo: Repository<ContratProfEntity>,
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

async listProfsByCoursId(coursIds: number[]): Promise<Record<number, number[]>> {
  if (!Array.isArray(coursIds) || coursIds.length === 0) return {};

  const rows = await this.repo
    .createQueryBuilder('cp')
    .innerJoin(
      ContratProfEntity,
      'contrat',
      'contrat.id = cp.contrat_id',
    )
    .select('cp.cours_id', 'cours_id')
    .addSelect('contrat.professeur_id', 'professeur_id')
    .where('cp.cours_id IN (:...coursIds)', { coursIds })
    .orderBy('cp.cours_id', 'ASC')
    .addOrderBy('contrat.professeur_id', 'ASC')
    .getRawMany<{ cours_id: number; professeur_id: number }>();

  const result: Record<number, number[]> = {};

  for (const r of rows) {
    const coursId = Number(r.cours_id);
    const professeurId = Number(r.professeur_id);

    if (!coursId || !professeurId) continue;

    (result[coursId] ??= []).push(professeurId);
  }

  for (const k of Object.keys(result)) {
    result[+k] = Array.from(new Set(result[+k])).sort((a, b) => a - b);
  }

  return result;
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

  async updateList(coursId: number, profsors: number[], saisonid: number, projectId: number) {
    console.log('profsors', profsors);  
     const listprof = await this.contratRepo.find({ where: { professeur_id: In(profsors), saison_id: saisonid } });
     const foundIds = listprof.map(p => p.id);
     console.log('foundIds', foundIds);
      const existing = await this.repo.find({ where: { cours_id: coursId } });
      console.log('existing', existing);
      const toDelete = existing.filter((e) => !foundIds.includes(e.contrat_id));
      const toAdd = foundIds.filter((p) => !existing.some((e) => e.contrat_id === p));
      toDelete.forEach((e) => this.remove(e.id, projectId));
      toAdd.forEach(async (p) => {
        let i :CreateCoursProfesseurDto = { cours_id: coursId, contrat_id: p};        
         this.create(i, projectId)
    });
    }
}
