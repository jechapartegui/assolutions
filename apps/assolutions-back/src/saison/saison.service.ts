import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSaisonDto, UpdateSaisonDto } from './saison.dto';
import { SaisonEntity } from './saison.entity';

@Injectable()
export class SaisonService {
  constructor(
    @InjectRepository(SaisonEntity)
    private readonly repo: Repository<SaisonEntity>,
  ) {}

  async listForProject(projectId: number) {
    const saisons = await this.repo.find({
      where: { project_id: projectId },
      order: { id: 'ASC' },
    });

    return this.sortBySaisonPrecedenteOrId(saisons);
  }

  private sortBySaisonPrecedenteOrId<
    T extends { id: number; saison_precedente?: number | null },
  >(saisons: T[]): T[] {
    if (!saisons?.length) return [];

    const byId = new Map<number, T>();
    for (const saison of saisons) byId.set(Number(saison.id), saison);

    const firstCandidates = saisons.filter((saison) => {
      const previousId = Number(saison.saison_precedente);
      return !Number.isFinite(previousId) || previousId <= 0 || !byId.has(previousId);
    });

    if (firstCandidates.length !== 1) {
      return [...saisons].sort((a, b) => a.id - b.id);
    }

    const nextByPreviousId = new Map<number, T>();
    for (const saison of saisons) {
      const previousId = Number(saison.saison_precedente);
      if (Number.isFinite(previousId) && previousId > 0 && byId.has(previousId)) {
        if (nextByPreviousId.has(previousId)) {
          return [...saisons].sort((a, b) => a.id - b.id);
        }
        nextByPreviousId.set(previousId, saison);
      }
    }

    const sorted: T[] = [];
    const visited = new Set<number>();
    let current: T | undefined = firstCandidates[0];

    while (current) {
      if (visited.has(current.id)) {
        return [...saisons].sort((a, b) => a.id - b.id);
      }
      sorted.push(current);
      visited.add(current.id);
      current = nextByPreviousId.get(current.id);
    }

    if (sorted.length !== saisons.length) {
      return [...saisons].sort((a, b) => a.id - b.id);
    }

    return sorted;
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`saison ${id} introuvable`);
    return item;
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.get(id);
    if (Number(item.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return item;
  }

  async create(dto: CreateSaisonDto, projectId: number) {
    if (dto.saison_precedente) {
      await this.getForProject(dto.saison_precedente, projectId);
    }

    const entity = this.repo.create({ ...dto, project_id: projectId });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateSaisonDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.saison_precedente != null) {
      if (Number(dto.saison_precedente) === Number(id)) {
        throw new ForbiddenException('INVALID_PREVIOUS_SEASON');
      }
      await this.getForProject(dto.saison_precedente, projectId);
    }

    Object.assign(item, dto, {
      project_id: projectId,
      date_maj: new Date(),
    });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
