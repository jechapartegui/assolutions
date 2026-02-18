import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateInscriptionSaisonDto, UpdateInscriptionSaisonDto } from './inscription_saison.dto';
import { InscriptionSaisonEntity } from './inscription_saison.entity';

@Injectable()
export class InscriptionSaisonService {
  constructor(
    @InjectRepository(InscriptionSaisonEntity)
    private readonly repo: Repository<InscriptionSaisonEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('saison', 's', 's.id = i.saison_id')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('i.id', 'ASC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`inscription_saison ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateInscriptionSaisonDto, projectId: number) {
    await this.assertSaisonInProject(dto.saison_id, projectId);

    const entity = this.repo.create(dto as CreateInscriptionSaisonDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('inscription_saison', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateInscriptionSaisonDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto);
    const saved = await this.repo.save(item);

    await this.registry.ensure('inscription_saison', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('inscription_saison', id);
    return { ok: true };
  }
}
