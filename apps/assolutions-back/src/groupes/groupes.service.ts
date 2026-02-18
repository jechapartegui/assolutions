import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateGroupesDto, UpdateGroupesDto } from './groupes.dto';
import { GroupesEntity } from './groupes.entity';

@Injectable()
export class GroupesService {
  constructor(
    @InjectRepository(GroupesEntity)
    private readonly repo: Repository<GroupesEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('g')
      .innerJoin('saison', 's', 's.id = g.saison_id')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('g.id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`groupes ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateGroupesDto, projectId: number) {
    await this.assertSaisonInProject(dto.saison_id, projectId);

    const entity = this.repo.create(dto as CreateGroupesDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('groupes', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateGroupesDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.saison_id && dto.saison_id !== item.saison_id) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('groupes', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('groupes', id);
    return { ok: true };
  }
}
