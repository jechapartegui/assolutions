import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateSeanceDto, UpdateSeanceDto } from './seance.dto';
import { SeanceEntity } from './seance.entity';

@Injectable()
export class SeanceService {
  constructor(
    @InjectRepository(SeanceEntity)
    private readonly repo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  async listbyId(ids: number[]) {
    return this.repo.find({
      where: {
           seance_id: In(ids),
      }
    });
  }
  async listForSaison(saison_id: number) {
    return this.repo.find({
      where: { saison_id },
      order: { seance_id: 'ASC' },
    });
  }



  async listForProject(projectId: number) {
    // On liste les séances dont la saison appartient au projet
    // (petite jointure simple)
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

    const entity = this.repo.create(dto as CreateSeanceDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('seance', saved.seance_id);
    return saved;
  }

  async update(id: number, dto: UpdateSeanceDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    // si on change la saison_id, on revalide l'appartenance projet
    if (dto.saison_id && dto.saison_id !== item.saison_id) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('seance', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('seance', id);
    return { ok: true };
  }
}
