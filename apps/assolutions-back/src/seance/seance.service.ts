import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SaisonEntity } from '../saison/saison.entity';
import { CreateSeanceDto, CreateSeanceRangeDto, UpdateSeanceDto } from './seance.dto';
import { SeanceEntity } from './seance.entity';

@Injectable()
export class SeanceService {
  constructor(
    @InjectRepository(SeanceEntity)
    private readonly repo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
  }

  async listByIds(ids: number[], projectId: number) {
    const cleanIds = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!cleanIds.length) return [];

    return this.repo
      .createQueryBuilder('seance')
      .innerJoin('saison', 's', 's.id = seance.saison_id')
      .where('seance.seance_id IN (:...ids)', { ids: cleanIds })
      .andWhere('s.project_id = :projectId', { projectId })
      .orderBy('seance.seance_id', 'ASC')
      .getMany();
  }

  async listForSaison(saisonId: number, projectId: number) {
    await this.assertSaisonInProject(saisonId, projectId);
    return this.repo.find({
      where: { saison_id: saisonId },
      order: { seance_id: 'ASC' },
    });
  }

  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('seance')
      .innerJoin('saison', 's', 's.id = seance.saison_id')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('seance.seance_id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { seance_id: id } });
    if (!item) throw new NotFoundException(`seance ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateSeanceDto, projectId: number) {
    await this.assertSaisonInProject(dto.saison_id, projectId);
    return this.repo.save(this.repo.create(dto));
  }

  async createRange(dto: CreateSeanceRangeDto, projectId: number): Promise<number[]> {
    const saison = await this.assertSaisonInProject(dto.seances.saison_id, projectId);
    const start = this.parseDate(dto.dateDebut);
    const end = this.parseDate(dto.dateFin);
    if (start > end) {
      throw new BadRequestException('La date de début doit précéder la date de fin.');
    }

    const saisonStart = this.parseDate(saison.date_debut);
    const saisonEnd = this.parseDate(saison.date_fin);
    if (start < saisonStart || end > saisonEnd) {
      throw new BadRequestException('La série doit être comprise dans les dates de la saison.');
    }

    const weekday = this.weekdayIndex(dto.jourSemaine);
    const cursor = new Date(start);
    while (cursor.getUTCDay() !== weekday) cursor.setUTCDate(cursor.getUTCDate() + 1);

    const entities: SeanceEntity[] = [];
    while (cursor <= end) {
      entities.push(
        this.repo.create({
          ...dto.seances,
          date_seance: cursor.toISOString().slice(0, 10),
        }),
      );
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    if (!entities.length) {
      throw new BadRequestException('Aucune séance ne correspond à cette plage.');
    }

    const saved = await this.repo.save(entities);
    return saved.map((item) => item.seance_id);
  }

  async update(id: number, dto: UpdateSeanceDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    if (dto.saison_id && dto.saison_id !== item.saison_id) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }
    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  private parseDate(value: string | Date): Date {
    const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const date = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Date invalide : ${value}`);
    return date;
  }

  private weekdayIndex(value: string): number {
    const normalized = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const days: Record<string, number> = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
    };
    const result = days[normalized];
    if (result === undefined) throw new BadRequestException(`Jour de semaine invalide : ${value}`);
    return result;
  }
}
