import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProfesseurEntity } from '../professeur/professeur.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateContratProfDto, UpdateContratProfDto } from './contrat_prof.dto';
import { ContratProfEntity } from './contrat_prof.entity';

@Injectable()
export class ContratProfService {
  constructor(
    @InjectRepository(ContratProfEntity)
    private readonly repo: Repository<ContratProfEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(ProfesseurEntity)
    private readonly professeurRepo: Repository<ProfesseurEntity>,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  async listForSeason(saisonId: number, projectId: number) {
    await this.assertSaisonInProject(saisonId, projectId);

    return this.repo
      .createQueryBuilder('c')
      .innerJoin('saison', 's', 's.id = c.saison_id')
      .where('s.id = :saisonId', { saisonId })
      .andWhere('s.project_id = :projectId', { projectId })
      .orderBy('c.id', 'ASC')
      .getMany();
  }

  async exist(profId: number, projectId: number) {
    const professeur = await this.professeurRepo.findOne({ where: { id: profId } });
    if (!professeur) throw new NotFoundException(`professeur ${profId} introuvable`);
    if (professeur.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');

    const count = await this.repo
      .createQueryBuilder('c')
      .innerJoin('saison', 's', 's.id = c.saison_id')
      .where('c.professeur_id = :profId', { profId })
      .andWhere('s.project_id = :projectId', { projectId })
      .getCount();

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

    const professeur = await this.professeurRepo.findOne({
      where: { id: dto.professeur_id },
    });
    if (!professeur) {
      throw new NotFoundException(`professeur ${dto.professeur_id} introuvable`);
    }
    if (professeur.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return this.repo.save(this.repo.create(dto as CreateContratProfDto));
  }

  async update(id: number, dto: UpdateContratProfDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.saison_id && dto.saison_id !== item.saison_id) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }

    if (dto.professeur_id && dto.professeur_id !== item.professeur_id) {
      const professeur = await this.professeurRepo.findOne({
        where: { id: dto.professeur_id },
      });
      if (!professeur) {
        throw new NotFoundException(`professeur ${dto.professeur_id} introuvable`);
      }
      if (professeur.project_id !== projectId) {
        throw new ForbiddenException('WRONG_PROJECT');
      }
    }

    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
