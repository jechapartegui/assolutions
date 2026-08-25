import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccessControlService } from './access-control.service';

type PersonAccessRow = { id: number; compte: number };

/**
 * Compatibilité avec les données historiques : un adhérent peut appartenir
 * fonctionnellement à un projet via une inscription saison/séance même si son
 * compte n'a pas (ou plus) de ligne login_project.
 *
 * Les adhérents non-staff conservent exactement les contrôles stricts du
 * service parent (compte propre / roster explicitement visible).
 */
@Injectable()
export class ProjectAwareAccessControlService extends AccessControlService {
  constructor(private readonly projectDataSource: DataSource) {
    super(projectDataSource);
  }

  override async assertPersonAccess(
    userId: number,
    personId: number,
    projectId?: number | null,
  ): Promise<PersonAccessRow> {
    const rows = (await this.projectDataSource.query(
      `SELECT id, compte FROM personne WHERE id = $1 LIMIT 1`,
      [Number(personId)],
    )) as PersonAccessRow[];

    const person = rows[0];
    if (!person) throw new NotFoundException('PERSON_NOT_FOUND');

    // L'accès à sa propre personne reste inchangé et ne dépend pas du projet.
    if (Number(person.compte) === Number(userId)) return person;

    const pid = Number(projectId);
    if (
      Number.isInteger(pid) &&
      pid > 0 &&
      (await this.isProjectStaffForRead(userId, pid))
    ) {
      // Même règle projet que pour les chargements en lot. Ainsi un adhérent
      // historique visible dans la liste reste ouvrable dans sa fiche détail.
      await this.assertPersonIdsAccess(userId, [Number(personId)], pid);
      return person;
    }

    return super.assertPersonAccess(userId, personId, projectId);
  }

  override async assertPersonIdsAccess(
    userId: number,
    rawIds: number[],
    projectId?: number | null,
  ): Promise<void> {
    const ids = this.cleanProjectIds(rawIds);
    if (!ids.length) return;

    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid <= 0) {
      return super.assertPersonIdsAccess(userId, ids, projectId);
    }

    if (!(await this.isProjectStaffForRead(userId, pid))) {
      return super.assertPersonIdsAccess(userId, ids, pid);
    }

    const people = (await this.projectDataSource.query(
      `SELECT id, compte FROM personne WHERE id = ANY($1::int[])`,
      [ids],
    )) as PersonAccessRow[];

    if (people.length !== ids.length) {
      throw new NotFoundException('PERSON_NOT_FOUND');
    }

    const allowedRows = (await this.projectDataSource.query(
      `
        SELECT DISTINCT pe.id
        FROM personne pe
        WHERE pe.id = ANY($1::int[])
          AND (
            pe.compte = $3
            OR EXISTS (
              SELECT 1
              FROM login_project lp
              WHERE lp.login_id = pe.compte
                AND lp.project_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM inscription_saison insa
              INNER JOIN saison sa ON sa.id = insa.saison_id
              WHERE insa.personne_id = pe.id
                AND sa.project_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM inscription_seance inse
              INNER JOIN seance se ON se.seance_id = inse.seance_id
              INNER JOIN saison sa ON sa.id = se.saison_id
              WHERE inse.personne_id = pe.id
                AND sa.project_id = $2
            )
          )
      `,
      [ids, pid, Number(userId)],
    )) as Array<{ id: number }>;

    const allowed = new Set(allowedRows.map((row) => Number(row.id)));
    if (ids.some((id) => !allowed.has(id))) {
      throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
    }
  }

  private async isProjectStaffForRead(
    userId: number,
    projectId: number,
  ): Promise<boolean> {
    const rows = await this.projectDataSource.query(
      `
        SELECT 1
        WHERE EXISTS (
          SELECT 1
          FROM project pr
          WHERE pr.id = $2
            AND pr.compte = $1
        )
        OR EXISTS (
          SELECT 1
          FROM professeur prof
          INNER JOIN personne pe ON pe.id = prof.id
          WHERE prof.project_id = $2
            AND pe.compte = $1
        )
        LIMIT 1
      `,
      [Number(userId), Number(projectId)],
    );

    return rows.length > 0;
  }

  private cleanProjectIds(rawIds: number[]): number[] {
    return [
      ...new Set(
        (rawIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }
}
