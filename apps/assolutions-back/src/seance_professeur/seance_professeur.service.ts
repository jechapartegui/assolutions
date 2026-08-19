import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CreateSeanceProfesseurDto, UpdateSeanceProfesseurDto } from './seance_professeur.dto';
import { SeanceProfesseurEntity } from './seance_professeur.entity';

@Injectable()
export class SeanceProfesseurService {
  constructor(
    @InjectRepository(SeanceProfesseurEntity)
    private readonly repo: Repository<SeanceProfesseurEntity>,
    @InjectRepository(SeanceEntity)
    private readonly seanceRepo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(ContratProfEntity)
    private readonly contratRepo: Repository<ContratProfEntity>,
  ) {}

  private async assertSeanceInProject(seanceId: number, projectId: number) {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: seance.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${seance.saison_id} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return seance;
  }

  private async assertContratForSeance(
    contratId: number,
    seance: SeanceEntity,
    projectId: number,
  ) {
    const contrat = await this.contratRepo.findOne({ where: { id: contratId } });
    if (!contrat) throw new NotFoundException(`contrat_prof ${contratId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: contrat.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${contrat.saison_id} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    if (Number(contrat.saison_id) !== Number(seance.saison_id)) {
      throw new ForbiddenException('CONTRACT_NOT_IN_SESSION_SEASON');
    }
    return contrat;
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

  async listBySeanceIds(ids: number[], projectId: number) {
    const cleanIds = this.cleanIds(ids);
    for (const id of cleanIds) await this.assertSeanceInProject(id, projectId);
    if (!cleanIds.length) return [];

    return this.repo.find({
      where: { seance_id: In(cleanIds) },
      select: { seance_id: true, professeurcontract_id: true },
      order: { id: 'ASC' },
    });
  }

  async listByContractIds(ids: number[], projectId: number) {
    const cleanIds = this.cleanIds(ids);
    if (!cleanIds.length) return [];

    const contracts = await this.contratRepo.find({ where: { id: In(cleanIds) } });
    if (contracts.length !== cleanIds.length) {
      throw new NotFoundException('CONTRACT_NOT_FOUND');
    }

    for (const contract of contracts) {
      const saison = await this.saisonRepo.findOne({ where: { id: contract.saison_id } });
      if (!saison || Number(saison.project_id) !== Number(projectId)) {
        throw new ForbiddenException('CONTRACT_NOT_IN_PROJECT');
      }
    }

    return this.repo.find({
      where: { professeurcontract_id: In(cleanIds) },
      select: { seance_id: true, professeurcontract_id: true },
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
    const seance = await this.assertSeanceInProject(dto.seance_id, projectId);
    await this.assertContratForSeance(dto.professeurcontract_id, seance, projectId);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateSeanceProfesseurDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    const nextSeanceId = dto.seance_id ?? item.seance_id;
    const nextContratId = dto.professeurcontract_id ?? item.professeurcontract_id;
    const seance = await this.assertSeanceInProject(nextSeanceId, projectId);
    await this.assertContratForSeance(nextContratId, seance, projectId);

    Object.assign(item, dto, { updated_at: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async updateList(seanceId: number, contractIds: number[], projectId: number) {
    const seance = await this.assertSeanceInProject(seanceId, projectId);
    const cleanContractIds = this.cleanIds(contractIds);

    // Tout valider avant la première mutation pour éviter les mises à jour partielles.
    for (const contractId of cleanContractIds) {
      await this.assertContratForSeance(contractId, seance, projectId);
    }

    const existing = await this.repo.find({ where: { seance_id: seanceId } });
    const toDelete = existing.filter(
      (item) => !cleanContractIds.includes(Number(item.professeurcontract_id)),
    );
    const existingIds = new Set(
      existing.map((item) => Number(item.professeurcontract_id)),
    );
    const toAdd = cleanContractIds.filter((id) => !existingIds.has(id));

    if (toDelete.length) await this.repo.remove(toDelete);

    if (toAdd.length) {
      const items = toAdd.map((contractId) => this.repo.create({
        seance_id: seanceId,
        professeurcontract_id: contractId,
        minutes: seance.duree_seance,
        statut: seance.statut,
      } as CreateSeanceProfesseurDto));
      await this.repo.save(items);
    }

    return this.repo.find({ where: { seance_id: seanceId }, order: { id: 'ASC' } });
  }

  private cleanIds(ids: number[]): number[] {
    const clean = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (clean.length > 500) throw new ForbiddenException('TOO_MANY_OBJECTS');
    return clean;
  }
}
