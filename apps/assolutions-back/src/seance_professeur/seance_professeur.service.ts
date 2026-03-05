import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { RegistryService } from '../registry/registry.service';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CreateSeanceProfesseurDto, UpdateSeanceProfesseurDto } from './seance_professeur.dto';
import { SeanceProfesseurEntity } from './seance_professeur.entity';

@Injectable()
export class SeanceProfesseurService {
  constructor(
    @InjectRepository(SeanceProfesseurEntity) private readonly repo: Repository<SeanceProfesseurEntity>,
    @InjectRepository(SeanceEntity) private readonly seanceRepo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity) private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(ContratProfEntity) private readonly contratRepo: Repository<ContratProfEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertSeanceInProject(seanceId: number, projectId: number) {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: seance.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${seance.saison_id} introuvable`);

    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  private async assertContratInProject(contratId: number, projectId: number) {
    const contrat = await this.contratRepo.findOne({ where: { id: contratId } });
    if (!contrat) throw new NotFoundException(`contrat_prof ${contratId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: contrat.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${contrat.saison_id} introuvable`);

    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('sp')
      .innerJoin('seance', 'se', 'se.seance_id = sp.seance_id')
      .innerJoin('saison', 'sa', 'sa.id = se.saison_id')
      .where('sa.project_id = :projectId', { projectId })
      .orderBy('sp.id', 'ASC')
      .getMany();
  }
  listbyIdSeance(ids: number[]) {
    return this.repo.find({
      where: {  
        seance_id: In(ids),
      },
      select: {
        seance_id: true,
        professeurcontract_id: true,
      },
      order: { id: 'ASC' },
    });
  }
  listbyIdProfesseurContract(ids: number[]) {
    return this.repo.find({
      where: {  
        professeurcontract_id: In(ids),
      },
      select: {
        seance_id: true,
        professeurcontract_id: true,
      },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`seance_professeur ${id} introuvable`);
    await this.assertSeanceInProject(item.seance_id, projectId);
    return item;
  }

  async create(dto: CreateSeanceProfesseurDto, projectId: number) {
    await this.assertSeanceInProject(dto.seance_id, projectId);
    await this.assertContratInProject(dto.professeurcontract_id, projectId);

    const saved = await this.repo.save(this.repo.create(dto as CreateSeanceProfesseurDto));
    await this.registry.ensure('seance_professeur', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateSeanceProfesseurDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.seance_id && dto.seance_id !== item.seance_id) {
      await this.assertSeanceInProject(dto.seance_id, projectId);
    }
    if (dto.professeurcontract_id && dto.professeurcontract_id !== item.professeurcontract_id) {
      await this.assertContratInProject(dto.professeurcontract_id, projectId);
    }

    Object.assign(item, dto, { updated_at: new Date() });
    const saved = await this.repo.save(item);
    await this.registry.ensure('seance_professeur', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    await this.registry.remove('seance_professeur', id);
    return { ok: true };
  }
}
