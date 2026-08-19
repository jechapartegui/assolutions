import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AccessControlService } from '../common/access-control.service';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateInscriptionSaisonDto, UpdateInscriptionSaisonDto } from './inscription_saison.dto';
import { InscriptionSaisonEntity } from './inscription_saison.entity';

@Injectable()
export class InscriptionSaisonService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(InscriptionSaisonEntity)
    private readonly repo: Repository<InscriptionSaisonEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly access: AccessControlService,
  ) {}

  async listByPersonnes(
    personneIds: number[],
    requesterId: number,
    projectId?: number | null,
  ) {
    const persons = await this.access.assertPersonIdsAccess(
      requesterId,
      personneIds,
      projectId,
    );
    const cleanIds = persons.map((person) => person.id);
    if (!cleanIds.length) return [];

    const params: unknown[] = [cleanIds];
    const projectClause = projectId
      ? 'AND pr.id = $2'
      : '';
    if (projectId) params.push(projectId);

    const sql = `
      SELECT
        ins.personne_id AS personne_id,
        pr.id AS project_id,
        pr.nom AS project_nom,
        s.id AS saison_id,
        s.nom AS saison_nom,
        ins.id AS inscription_id,
        ins.active AS active
      FROM inscription_saison ins
      JOIN saison s ON s.id = ins.saison_id
      JOIN project pr ON pr.id = s.project_id
      WHERE ins.personne_id = ANY($1::int[])
      ${projectClause}
      ORDER BY pr.nom, s.date_debut DESC, s.nom
    `;

    return this.dataSource.query(sql, params);
  }

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
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

  async create(
    dto: CreateInscriptionSaisonDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSaisonInProject(dto.saison_id, projectId);
    await this.access.getAuthorizedPerson(requesterId, dto.personne_id, projectId);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateInscriptionSaisonDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async listForSaison(saisonId: number, projectId: number) {
    await this.assertSaisonInProject(saisonId, projectId);
    return this.repo.find({ where: { saison_id: saisonId }, order: { id: 'ASC' } });
  }

  async listForPersonne(
    personneId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.access.getAuthorizedPerson(requesterId, personneId, projectId);
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('saison', 's', 's.id = i.saison_id')
      .where('i.personne_id = :personneId', { personneId })
      .andWhere('s.project_id = :projectId', { projectId })
      .orderBy('i.id', 'ASC')
      .getMany();
  }
}
