import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateLienGroupeDto, UpdateLienGroupeDto } from './lien_groupe.dto';
import { LienGroupeEntity } from './lien_groupe.entity';

@Injectable()
export class LienGroupeService {
  constructor(
    @InjectRepository(LienGroupeEntity)
    private readonly repo: Repository<LienGroupeEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupesRepo: Repository<GroupesEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertGroupeInProject(groupeId: number, projectId: number) {
    const groupe = await this.groupesRepo.findOne({ where: { id: groupeId } });
    if (!groupe) throw new NotFoundException(`groupe ${groupeId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: groupe.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${groupe.saison_id} introuvable`);

    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('l')
      .innerJoin('groupes', 'g', 'g.id = l.groupe_id')
      .innerJoin('saison', 's', 's.id = g.saison_id')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('l.id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`lien_groupe ${id} introuvable`);
    await this.assertGroupeInProject(item.groupe_id, projectId);
    return item;
  }

  async create(dto: CreateLienGroupeDto, projectId: number) {
    await this.assertGroupeInProject(dto.groupe_id, projectId);

    const entity = this.repo.create(dto as CreateLienGroupeDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('lien_groupe', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateLienGroupeDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('lien_groupe', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('lien_groupe', id);
    return { ok: true };
  }
}
