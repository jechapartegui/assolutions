import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CoursEntity } from '../cours/cours.entity';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { CreateCoursProfesseurDto, UpdateCoursProfesseurDto } from './cours_professeur.dto';
import { CoursProfesseurEntity } from './cours_professeur.entity';

@Injectable()
export class CoursProfesseurService {
  constructor(
    @InjectRepository(CoursProfesseurEntity)
    private readonly repo: Repository<CoursProfesseurEntity>,
    @InjectRepository(CoursEntity)
    private readonly coursRepo: Repository<CoursEntity>,
    @InjectRepository(ContratProfEntity)
    private readonly contratRepo: Repository<ContratProfEntity>,
  ) {}

  private async assertCoursInProject(coursId: number, projectId: number) {
    const cours = await this.coursRepo.findOne({ where: { id: coursId } });
    if (!cours) throw new NotFoundException(`cours ${coursId} introuvable`);
    if (Number(cours.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return cours;
  }

  private async assertContractForCourse(contratId: number, cours: CoursEntity) {
    const contrat = await this.contratRepo.findOne({ where: { id: contratId } });
    if (!contrat) throw new NotFoundException(`contrat_prof ${contratId} introuvable`);
    if (Number(contrat.saison_id) !== Number(cours.saison_id)) {
      throw new ForbiddenException('CONTRACT_NOT_IN_COURSE_SEASON');
    }
    return contrat;
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('cp')
      .innerJoin('cours', 'c', 'c.id = cp.cours_id')
      .where('c.project_id = :projectId', { projectId })
      .orderBy('cp.id', 'ASC')
      .getMany();
  }

  async listProfsByCoursId(
    coursIds: number[],
    projectId: number,
  ): Promise<Record<number, number[]>> {
    const cleanIds = [...new Set((coursIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!cleanIds.length) return {};
    if (cleanIds.length > 500) throw new ForbiddenException('TOO_MANY_OBJECTS');

    const courses = await this.coursRepo.find({ where: { id: In(cleanIds) } });
    if (
      courses.length !== cleanIds.length ||
      courses.some((cours) => Number(cours.project_id) !== Number(projectId))
    ) {
      throw new ForbiddenException('COURSE_NOT_IN_PROJECT');
    }

    const rows = await this.repo
      .createQueryBuilder('cp')
      .select('cp.cours_id', 'cours_id')
      .addSelect('cp.contrat_id', 'contrat_id')
      .where('cp.cours_id IN (:...coursIds)', { coursIds: cleanIds })
      .orderBy('cp.cours_id', 'ASC')
      .addOrderBy('cp.contrat_id', 'ASC')
      .getRawMany<{ cours_id: number; contrat_id: number }>();

    const result: Record<number, number[]> = {};
    for (const row of rows) {
      const coursId = Number(row.cours_id);
      const contratId = Number(row.contrat_id);
      if (!coursId || !contratId) continue;
      (result[coursId] ??= []).push(contratId);
    }
    for (const key of Object.keys(result)) {
      result[Number(key)] = Array.from(new Set(result[Number(key)])).sort((a, b) => a - b);
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
    const cours = await this.assertCoursInProject(dto.cours_id, projectId);
    await this.assertContractForCourse(dto.contrat_id, cours);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateCoursProfesseurDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    const nextCoursId = dto.cours_id ?? item.cours_id;
    const nextContratId = dto.contrat_id ?? item.contrat_id;
    const cours = await this.assertCoursInProject(nextCoursId, projectId);
    await this.assertContractForCourse(nextContratId, cours);

    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async updateList(
    coursId: number,
    contratIds: number[],
    saisonId: number,
    projectId: number,
  ) {
    const cours = await this.assertCoursInProject(coursId, projectId);
    if (Number(cours.saison_id) !== Number(saisonId)) {
      throw new ForbiddenException('SEASON_MISMATCH');
    }

    const requestedIds = [...new Set((contratIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (requestedIds.length > 500) throw new ForbiddenException('TOO_MANY_OBJECTS');

    const validContracts = requestedIds.length
      ? await this.contratRepo.find({
          where: { id: In(requestedIds), saison_id: cours.saison_id },
        })
      : [];
    const validIds = validContracts.map((contract) => Number(contract.id));
    if (validIds.length !== requestedIds.length) {
      throw new ForbiddenException('CONTRACT_NOT_IN_COURSE_SEASON');
    }

    const existing = await this.repo.find({ where: { cours_id: coursId } });
    const toDelete = existing.filter((item) => !validIds.includes(Number(item.contrat_id)));
    const existingContractIds = new Set(existing.map((item) => Number(item.contrat_id)));
    const toAdd = validIds.filter((id) => !existingContractIds.has(id));

    if (toDelete.length) await this.repo.remove(toDelete);
    if (toAdd.length) {
      await this.repo.save(toAdd.map((contratId) => this.repo.create({
        cours_id: coursId,
        contrat_id: contratId,
      })));
    }

    return this.repo.find({ where: { cours_id: coursId }, order: { id: 'ASC' } });
  }
}
