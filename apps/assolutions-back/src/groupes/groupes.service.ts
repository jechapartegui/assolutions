import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SaisonEntity } from '../saison/saison.entity';
import { CreateGroupesDto, UpdateGroupesDto } from './groupes.dto';
import { GroupesEntity } from './groupes.entity';

type GroupeEligibilityCriteria = Pick<
  GroupesEntity,
  'age_min' | 'age_max' | 'naissance_avant' | 'naissance_apres' | 'limit_nb'
>;

@Injectable()
export class GroupesService {
  constructor(
    @InjectRepository(GroupesEntity)
    private readonly repo: Repository<GroupesEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
  ) {}

  private async assertSaisonInProject(
    saisonId: number,
    projectId: number,
  ): Promise<void> {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  private assertEligibilityCriteria(criteria: GroupeEligibilityCriteria): void {
    if (
      criteria.age_min !== null &&
      criteria.age_max !== null &&
      criteria.age_min > criteria.age_max
    ) {
      throw new BadRequestException(
        "L'âge minimum ne peut pas être supérieur à l'âge maximum",
      );
    }

    if (
      criteria.naissance_avant !== null &&
      criteria.naissance_apres !== null &&
      criteria.naissance_avant > criteria.naissance_apres
    ) {
      throw new BadRequestException(
        "L'année 'né(e) au plus tôt' ne peut pas dépasser l'année 'né(e) au plus tard'",
      );
    }
  }

  private criteriaFromCreateDto(dto: CreateGroupesDto): GroupeEligibilityCriteria {
    return {
      age_min: dto.age_min ?? null,
      age_max: dto.age_max ?? null,
      naissance_avant: dto.naissance_avant ?? null,
      naissance_apres: dto.naissance_apres ?? null,
      limit_nb: dto.limit_nb ?? null,
    };
  }

  private criteriaAfterUpdate(
    item: GroupesEntity,
    dto: UpdateGroupesDto,
  ): GroupeEligibilityCriteria {
    return {
      age_min: dto.age_min !== undefined ? dto.age_min : item.age_min,
      age_max: dto.age_max !== undefined ? dto.age_max : item.age_max,
      naissance_avant:
        dto.naissance_avant !== undefined ? dto.naissance_avant : item.naissance_avant,
      naissance_apres:
        dto.naissance_apres !== undefined ? dto.naissance_apres : item.naissance_apres,
      limit_nb: dto.limit_nb !== undefined ? dto.limit_nb : item.limit_nb,
    };
  }

  async listForProject(
    saisonId: number,
    projectId: number,
  ): Promise<GroupesEntity[]> {
    await this.assertSaisonInProject(saisonId, projectId);
    return this.repo.find({
      where: { saison_id: saisonId },
      order: { nom: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number): Promise<GroupesEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`groupes ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateGroupesDto, projectId: number): Promise<GroupesEntity> {
    await this.assertSaisonInProject(dto.saison_id, projectId);
    const criteria = this.criteriaFromCreateDto(dto);
    this.assertEligibilityCriteria(criteria);

    const entity = this.repo.create({
      ...dto,
      nom: dto.nom.trim(),
      whatsapp: dto.whatsapp?.trim() || null,
      visible: dto.visible ?? null,
      ...criteria,
    });

    return this.repo.save(entity);
  }

  async update(
    id: number,
    dto: UpdateGroupesDto,
    projectId: number,
  ): Promise<GroupesEntity> {
    const item = await this.getForProject(id, projectId);
    const targetSeasonId = dto.saison_id ?? item.saison_id;

    if (targetSeasonId !== item.saison_id) {
      await this.assertSaisonInProject(targetSeasonId, projectId);
    }

    const criteria = this.criteriaAfterUpdate(item, dto);
    this.assertEligibilityCriteria(criteria);

    Object.assign(item, dto, criteria, {
      saison_id: targetSeasonId,
      date_maj: new Date(),
    });

    if (dto.nom !== undefined) item.nom = dto.nom.trim();
    if (dto.whatsapp !== undefined) item.whatsapp = dto.whatsapp?.trim() || null;

    return this.repo.save(item);
  }

  async remove(id: number, projectId: number): Promise<{ ok: true }> {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
