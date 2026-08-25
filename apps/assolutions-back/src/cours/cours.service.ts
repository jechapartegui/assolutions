import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { SaisonEntity } from '../saison/saison.entity';
import { CreateCoursDto, UpdateCoursDto, UpdateCoursSerieDto } from './cours.dto';
import { CoursEntity } from './cours.entity';

@Injectable()
export class CoursService {
  constructor(
    @InjectRepository(CoursEntity)
    private readonly repo: Repository<CoursEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
  }

  async listForSaison(saisonId: number, projectId: number) {
    await this.assertSaisonInProject(saisonId, projectId);
    return this.repo.find({
      where: { saison_id: saisonId },
      order: { nom: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`cours ${id} introuvable`);
    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  async create(dto: CreateCoursDto, projectId: number) {
    await this.assertSaisonInProject(dto.saison_id, projectId);
    return this.repo.save(this.repo.create({ ...dto, project_id: projectId }));
  }

  async update(id: number, dto: UpdateCoursDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    if (dto.saison_id && Number(dto.saison_id) !== Number(item.saison_id)) {
      await this.assertSaisonInProject(dto.saison_id, projectId);
    }
    Object.assign(item, dto, { project_id: projectId, date_maj: new Date() });
    return this.repo.save(item);
  }

  async updateSerie(id: number, dto: UpdateCoursSerieDto, projectId: number) {
    const cours = await this.getForProject(id, projectId);
    const fromDate = this.dateOnly(dto.fromDate);
    const saisonId = Number(dto.saison_id ?? cours.saison_id);
    await this.assertSaisonInProject(saisonId, projectId);

    const values = {
      nom: dto.nom ?? cours.nom,
      heure: dto.heure ?? cours.heure,
      duree: dto.duree ?? cours.duree,
      lieuId: dto.lieu_id ?? cours.lieu_id,
      ageMin: dto.age_minimum !== undefined ? dto.age_minimum : cours.age_minimum,
      ageMax: dto.age_maximum !== undefined ? dto.age_maximum : cours.age_maximum,
      placeMax: dto.place_maximum !== undefined ? dto.place_maximum : cours.place_maximum,
      convocationNominative:
        dto.convocation_nominative ?? cours.convocation_nominative ?? false,
      afficherPresent: dto.afficher_present ?? cours.afficher_present ?? false,
      essaiPossible: dto.essai_possible ?? cours.essai_possible ?? false,
      appointment: dto.appointment !== undefined ? dto.appointment : cours.appointment,
    };

    return this.dataSource.transaction(async (manager) => {
      const seances: Array<{ seance_id: number }> = await manager.query(
        `
          UPDATE seance
          SET label = $1,
              heure_debut = $2,
              duree_seance = $3,
              lieu_id = $4,
              age_minimum = $5,
              age_maximum = $6,
              place_maximum = $7,
              convocation_nominative = $8,
              afficher_present = $9,
              essai_possible = $10,
              appointment = $11,
              est_limite_age_minimum = ($5 IS NOT NULL),
              est_limite_age_maximum = ($6 IS NOT NULL),
              est_place_maximum = ($7 IS NOT NULL),
              date_maj = now()
          WHERE cours = $12
            AND saison_id = $13
            AND date_seance >= $14::date
          RETURNING seance_id
        `,
        [
          values.nom,
          values.heure,
          values.duree,
          values.lieuId,
          values.ageMin,
          values.ageMax,
          values.placeMax,
          values.convocationNominative,
          values.afficherPresent,
          values.essaiPossible,
          values.appointment,
          id,
          saisonId,
          fromDate,
        ],
      );

      const seanceIds = seances.map((row) => Number(row.seance_id)).filter((value) => value > 0);
      if (!seanceIds.length) return { updated: 0 };

      await manager.query(
        `DELETE FROM seance_professeur WHERE seance_id = ANY($1::int[])`,
        [seanceIds],
      );
      await manager.query(
        `
          INSERT INTO seance_professeur (seance_id, minutes, professeurcontract_id, statut)
          SELECT s.seance_id,
                 s.duree_seance,
                 cp.contrat_id,
                 'prévue'
          FROM seance s
          CROSS JOIN cours_professeur cp
          WHERE s.seance_id = ANY($1::int[])
            AND cp.cours_id = $2
        `,
        [seanceIds, id],
      );

      await manager.query(
        `
          DELETE FROM lien_groupe
          WHERE object_type = 'séance'
            AND object_id = ANY($1::int[])
        `,
        [seanceIds],
      );
      await manager.query(
        `
          INSERT INTO lien_groupe (groupe_id, object_id, object_type)
          SELECT DISTINCT lg.groupe_id, session_id, 'séance'
          FROM lien_groupe lg
          CROSS JOIN unnest($1::int[]) AS session_id
          WHERE lg.object_type = 'cours'
            AND lg.object_id = $2
        `,
        [seanceIds, id],
      );

      return { updated: seanceIds.length };
    });
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  private dateOnly(value: string | Date): string {
    const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Date invalide : ${value}`);
    }
    return raw;
  }
}
