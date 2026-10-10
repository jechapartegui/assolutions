import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { CraEntity, CraLigneEntity } from '../cra/cra.entity';

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
    private readonly dataSource: DataSource,
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

  private async getinfoseance(seanceId: number) {
  const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
  if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);

  return {
    duree_seance: seance.duree_seance,
    statut: seance.statut,
  };
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
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);

    await this.dataSource.transaction(async (manager) => {
      const ligneRepo = manager.getRepository(CraLigneEntity);
      const craRepo = manager.getRepository(CraEntity);
      const seanceProfRepo = manager.getRepository(SeanceProfesseurEntity);

      const linkedLines = await ligneRepo.find({
        where: { seance_professeur_id: item.id },
      });

      if (linkedLines.length) {
        const craIds = [...new Set(linkedLines.map((line) => line.cra_id))];
        const cras = await craRepo.find({ where: { id: In(craIds) } });

        if (cras.some((cra) => cra.project_id !== projectId)) {
          throw new ForbiddenException('WRONG_PROJECT');
        }

        if (cras.some((cra) => cra.statut !== 'BROUILLON')) {
          throw new BadRequestException('CRA_LOCKED');
        }

        await ligneRepo.delete({ seance_professeur_id: item.id });

        for (const cra of cras) {
          const remainingLines = await ligneRepo.find({ where: { cra_id: cra.id } });
          const total = remainingLines.reduce((sum, line) => sum + Number(line.montant), 0);
          await craRepo.update(cra.id, {
            montant_total: total.toFixed(2),
            updated_at: new Date(),
          });
        }
      }

      await seanceProfRepo.delete(item.id);
    });

    return { ok: true };
  }

  async updateList(seanceId: number, profsors: number[], projectId: number) {
    await this.assertSeanceInProject(seanceId, projectId);

    const requestedProfessors = [...new Set((profsors ?? []).map((id) => Number(id)))];
    const existing = await this.repo.find({ where: { seance_id: seanceId } });
    const toDelete = existing.filter(
      (item) => !requestedProfessors.includes(item.professeurcontract_id),
    );
    const toAdd = requestedProfessors.filter(
      (contratId) => !existing.some((item) => item.professeurcontract_id === contratId),
    );

    for (const item of toDelete) {
      await this.remove(item.id, projectId);
    }

    const seanceInfo = await this.getinfoseance(seanceId);
    for (const contratId of toAdd) {
      const dto: CreateSeanceProfesseurDto = {
        seance_id: seanceId,
        professeurcontract_id: contratId,
        minutes: seanceInfo.duree_seance,
        statut: seanceInfo.statut,
      };
      await this.create(dto, projectId);
    }

    return this.repo.find({
      where: { seance_id: seanceId },
      order: { id: 'ASC' },
    });
  }
}
