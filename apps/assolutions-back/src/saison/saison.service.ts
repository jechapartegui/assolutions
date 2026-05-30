import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateSaisonDto, UpdateSaisonDto } from './saison.dto';
import { SaisonEntity } from './saison.entity';

@Injectable()
export class SaisonService {
  constructor(
    @InjectRepository(SaisonEntity)
    private readonly repo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

async listForProject(projectId: number) {
  const saisons = await this.repo.find({
    where: { project_id: projectId },
    order: { id: 'ASC' },
  });

  return this.sortBySaisonPrecedenteOrId(saisons);
}

private sortBySaisonPrecedenteOrId<T extends { id: number; saison_precedente?: number | null }>(
  saisons: T[],
): T[] {
  if (!saisons?.length) return [];

  const byId = new Map<number, T>();
  const previousIds = new Set<number>();

  for (const saison of saisons) {
    byId.set(Number(saison.id), saison);

    const previousId = Number(saison.saison_precedente);
    if (Number.isFinite(previousId) && previousId > 0) {
      previousIds.add(previousId);
    }
  }

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

  async create(dto: CreateSaisonDto, projectId: number) {
    const entity = this.repo.create({ ...dto, project_id: projectId });
    const saved = await this.repo.save(entity);

    await this.registry.ensure('saison', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateSaisonDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('saison', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    await this.registry.remove('saison', id);
    return { ok: true };
  }
}
