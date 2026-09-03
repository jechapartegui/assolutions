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
      jourSemaine: dto.jour_semaine ?? cours.jour_semaine,
      heure: dto.heure ?? cours.heure,
      duree: dto.duree ?? cours.duree,
      profPrincipalId: dto.prof_principal_id ?? cours.prof_principal_id,
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
      const profIds =
        dto.professeur_contrat_ids !== undefined
          ? this.cleanIds(dto.professeur_contrat_ids)
          : (
              await manager.query(
                `SELECT contrat_id FROM cours_professeur WHERE cours_id = $1 ORDER BY contrat_id`,
                [id],
              )
            )
              .map((row: { contrat_id: number }) => Number(row.contrat_id))
              .filter((value: number) => value > 0);

      const groupeIds =
        dto.groupe_ids !== undefined
          ? this.cleanIds(dto.groupe_ids)
          : (
              await manager.query(
                `
                  SELECT groupe_id
                  FROM lien_groupe
                  WHERE object_type = 'cours'
                    AND object_id = $1
                  ORDER BY groupe_id
                `,
                [id],
              )
            )
              .map((row: { groupe_id: number }) => Number(row.groupe_id))
              .filter((value: number) => value > 0);

      if (profIds.length) {
        const validProfs: Array<{ id: number }> = await manager.query(
          `SELECT id FROM contrat_prof WHERE saison_id = $1 AND id = ANY($2::int[])`,
          [saisonId, profIds],
        );
        if (validProfs.length !== profIds.length) {
          throw new BadRequestException(
            'Un ou plusieurs contrats professeur sont invalides pour cette saison',
          );
        }
      }

      if (groupeIds.length) {
        const validGroupes: Array<{ id: number }> = await manager.query(
          `SELECT id FROM groupes WHERE saison_id = $1 AND id = ANY($2::int[])`,
          [saisonId, groupeIds],
        );
        if (validGroupes.length !== groupeIds.length) {
          throw new BadRequestException(
            'Un ou plusieurs groupes sont invalides pour cette saison',
          );
        }
      }

      if (
        values.profPrincipalId > 0 &&
        dto.professeur_contrat_ids !== undefined &&
        !profIds.includes(Number(values.profPrincipalId))
      ) {
        throw new BadRequestException(
          'Le professeur principal doit faire partie des professeurs du cours',
        );
      }

      await manager.update(
        CoursEntity,
        { id },
        {
          project_id: projectId,
          nom: values.nom,
          jour_semaine: values.jourSemaine,
          heure: values.heure,
          duree: values.duree,
          prof_principal_id: values.profPrincipalId,
          lieu_id: values.lieuId,
          age_minimum: values.ageMin,
          age_maximum: values.ageMax,
          saison_id: saisonId,
          place_maximum: values.placeMax,
          convocation_nominative: values.convocationNominative,
          afficher_present: values.afficherPresent,
          essai_possible: values.essaiPossible,
          appointment: values.appointment,
          date_maj: new Date(),
        },
      );

      if (dto.professeur_contrat_ids !== undefined) {
        await manager.query(`DELETE FROM cours_professeur WHERE cours_id = $1`, [id]);
        if (profIds.length) {
          await manager.query(
            `
              INSERT INTO cours_professeur (cours_id, contrat_id)
              SELECT $1, p.contrat_id
              FROM unnest($2::int[]) AS p(contrat_id)
            `,
            [id, profIds],
          );
        }
      }

      if (dto.groupe_ids !== undefined) {
        await manager.query(
          `DELETE FROM lien_groupe WHERE object_type = 'cours' AND object_id = $1`,
          [id],
        );
        if (groupeIds.length) {
          await manager.query(
            `
              INSERT INTO lien_groupe (groupe_id, object_id, object_type)
              SELECT g.groupe_id, $1, 'cours'
              FROM unnest($2::int[]) AS g(groupe_id)
            `,
            [id, groupeIds],
          );
        }
      }

      const seances: Array<{ seance_id: number }> = await manager.query(
        `
          UPDATE seance
          SET label = $1,
              heure_debut = $2,
              duree_seance = $3,
              lieu_id = $4,
              age_minimum = $5::int,
              age_maximum = $6::int,
              place_maximum = $7::int,
              convocation_nominative = $8,
              afficher_present = $9,
              essai_possible = $10,
              appointment = $11,
              est_limite_age_minimum = ($5::int IS NOT NULL),
              est_limite_age_maximum = ($6::int IS NOT NULL),
              est_place_maximum = ($7::int IS NOT NULL),
              date_maj = now()
          WHERE cours = $12
            AND saison_id = $13
            AND date_seance >= GREATEST($14::date, CURRENT_DATE)
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

      const seanceIds = seances
        .map((row) => Number(row.seance_id))
        .filter((value) => value > 0);

      if (!seanceIds.length) {
        return {
          updated: 0,
          professeurs: profIds.length,
          groupes: groupeIds.length,
        };
      }

      await manager.query(
        `DELETE FROM seance_professeur WHERE seance_id = ANY($1::int[])`,
        [seanceIds],
      );
      if (profIds.length) {
        await manager.query(
          `
            INSERT INTO seance_professeur (
              seance_id,
              minutes,
              professeurcontract_id,
              statut
            )
            SELECT s.seance_id,
                   s.duree_seance,
                   p.contrat_id,
                   'prévue'
            FROM seance s
            CROSS JOIN unnest($2::int[]) AS p(contrat_id)
            WHERE s.seance_id = ANY($1::int[])
          `,
          [seanceIds, profIds],
        );
      }

      await manager.query(
        `
          DELETE FROM lien_groupe
          WHERE object_type = 'séance'
            AND object_id = ANY($1::int[])
        `,
        [seanceIds],
      );
      if (groupeIds.length) {
        await manager.query(
          `
            INSERT INTO lien_groupe (groupe_id, object_id, object_type)
            SELECT g.groupe_id, s.seance_id, 'séance'
            FROM unnest($2::int[]) AS g(groupe_id)
            CROSS JOIN unnest($1::int[]) AS s(seance_id)
          `,
          [seanceIds, groupeIds],
        );
      }

      return {
        updated: seanceIds.length,
        professeurs: profIds.length,
        groupes: groupeIds.length,
      };
    });
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  private cleanIds(values: number[] | null | undefined): number[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
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
