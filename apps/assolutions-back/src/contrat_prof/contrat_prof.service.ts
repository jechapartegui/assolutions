import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateContratProfDto, UpdateContratProfDto } from './contrat_prof.dto';
import { ContratProfEntity } from './contrat_prof.entity';

@Injectable()
export class ContratProfService {
  constructor(
    @InjectRepository(ContratProfEntity) private readonly repo: Repository<ContratProfEntity>,
    @InjectRepository(SaisonEntity) private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  listForSeason(saisonId: number) {
    return this.repo
      .createQueryBuilder('c')
      .innerJoin('saison', 's', 's.id = c.saison_id')
      .where('s.id = :saisonId', { saisonId })
      .orderBy('c.id', 'ASC')
      .getMany();
  }

  async exist(profId: number) {
    const count = await this.repo.count({ where: { professeur_id: profId } });
    return count > 0;
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`contrat_prof ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateContratProfDto, projectId: number) {
    await this.assertSaisonInProject(dto.saison_id, projectId);

    const saved = await this.repo.save(this.repo.create(dto as CreateContratProfDto));
    await this.registry.ensure('contrat_prof', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateContratProfDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.saison_id && dto.saison_id !== item.saison_id) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('contrat_prof', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('contrat_prof', id);
    return { ok: true };
  }
}
