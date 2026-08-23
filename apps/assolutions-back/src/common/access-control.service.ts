import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

type PersonAccessRow = { id: number; compte: number };
type DocumentAccessRow = {
  id: number;
  project_id: number | null;
  objet_type: string;
  objet_id: number;
};

type SeanceRosterAccessRow = {
  afficher_present: boolean;
};

@Injectable()
export class AccessControlService {
  constructor(private readonly dataSource: DataSource) {}

  async assertProjectAdmin(userId: number, projectId: number): Promise<void> {
    this.assertPositiveId(userId, 'USER_ID_REQUIRED');
    this.assertPositiveId(projectId, 'PROJECT_ID_REQUIRED');

    const rows = await this.dataSource.query(
      `SELECT 1 FROM project WHERE id = $1 AND compte = $2 LIMIT 1`,
      [projectId, userId],
    );

    if (!rows.length) {
      throw new ForbiddenException('NOT_PROJECT_ADMIN');
    }
  }

  async assertProjectStaff(userId: number, projectId: number): Promise<void> {
    this.assertPositiveId(userId, 'USER_ID_REQUIRED');
    this.assertPositiveId(projectId, 'PROJECT_ID_REQUIRED');

    if (await this.isProjectStaff(userId, projectId)) return;
    throw new ForbiddenException('NOT_PROJECT_STAFF');
  }

  // Compatibilité avec les contrôleurs métier existants : "ProfOrAdmin" est
  // le même périmètre fonctionnel que "Staff" (administrateur du projet ou
  // professeur du projet). On conserve les deux noms pour ne pas casser les
  // appels historiques.
  async assertProjectProfOrAdmin(
    userId: number,
    projectId: number,
  ): Promise<void> {
    return this.assertProjectStaff(userId, projectId);
  }

  async assertAccountAccessForProjectStaff(
    userId: number,
    accountId: number,
    projectId?: number | null,
  ): Promise<void> {
    this.assertPositiveId(accountId, 'ACCOUNT_ID_REQUIRED');

    if (Number(userId) === Number(accountId)) return;

    const pid = this.requireProjectId(projectId);
    await this.assertProjectStaff(userId, pid);
    await this.assertAccountBelongsToProject(accountId, pid);
  }

  async assertAccountAccess(
    userId: number,
    accountId: number,
    projectId?: number | null,
  ): Promise<void> {
    this.assertPositiveId(accountId, 'ACCOUNT_ID_REQUIRED');

    if (Number(userId) === Number(accountId)) return;

    const pid = this.requireProjectId(projectId);
    // Cette méthode reste volontairement admin-only : certains contrôleurs
    // l'utilisent pour des opérations destructives (suppression de compte).
    await this.assertProjectAdmin(userId, pid);
    await this.assertAccountBelongsToProject(accountId, pid);
  }

  async assertAccountBelongsToProject(
    accountId: number,
    projectId: number,
  ): Promise<void> {
    const rows = await this.dataSource.query(
      `
        SELECT 1
        FROM login_project
        WHERE login_id = $1 AND project_id = $2
        LIMIT 1
      `,
      [accountId, projectId],
    );

    if (!rows.length) {
      throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
    }
  }

  async assertAccountHasProjectContext(
    accountId: number,
    projectId: number,
  ): Promise<void> {
    const rows = await this.dataSource.query(
      `
        SELECT 1
        WHERE EXISTS (
          SELECT 1
          FROM project
          WHERE id = $2 AND compte = $1
        )
        OR EXISTS (
          SELECT 1
          FROM login_project
          WHERE login_id = $1 AND project_id = $2
        )
        LIMIT 1
      `,
      [accountId, projectId],
    );

    if (!rows.length) {
      throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
    }
  }

  async assertPersonAccess(
    userId: number,
    personId: number,
    projectId?: number | null,
  ): Promise<PersonAccessRow> {
    const person = await this.getPerson(personId);

    if (Number(person.compte) === Number(userId)) return person;

    const pid = this.requireProjectId(projectId);
    await this.assertProjectStaff(userId, pid);
    await this.assertAccountBelongsToProject(person.compte, pid);
    return person;
  }

  async assertPersonIdsAccess(
    userId: number,
    rawIds: number[],
    projectId?: number | null,
  ): Promise<void> {
    const ids = this.cleanIds(rawIds);
    if (!ids.length) return;

    const people = (await this.dataSource.query(
      `SELECT id, compte FROM personne WHERE id = ANY($1::int[])`,
      [ids],
    )) as PersonAccessRow[];

    if (people.length !== ids.length) {
      throw new NotFoundException('PERSON_NOT_FOUND');
    }

    const foreignAccounts = [
      ...new Set(
        people
          .filter((person) => Number(person.compte) !== Number(userId))
          .map((person) => Number(person.compte)),
      ),
    ];

    if (!foreignAccounts.length) return;

    const pid = this.requireProjectId(projectId);

    // Les professeurs sont des gestionnaires métier du projet : ils peuvent lire
    // les personnes nécessaires à la gestion des adhérents/séances.
    if (await this.isProjectStaff(userId, pid)) {
      const rows = (await this.dataSource.query(
        `
          SELECT login_id
          FROM login_project
          WHERE project_id = $1
            AND login_id = ANY($2::int[])
        `,
        [pid, foreignAccounts],
      )) as Array<{ login_id: number }>;

      const allowed = new Set(rows.map((row) => Number(row.login_id)));
      if (foreignAccounts.some((accountId) => !allowed.has(accountId))) {
        throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
      }
      return;
    }

    // Un adhérent non-prof ne peut lire des personnes tierces que si celles-ci
    // apparaissent réellement dans une séance du projet dont les présents sont
    // explicitement visibles.
    await this.assertAccountHasProjectContext(userId, pid);
    await this.assertVisibleRosterPersonIds(ids, pid);
  }

  async assertSeanceRosterAccess(
    userId: number,
    seanceId: number,
    projectId: number,
  ): Promise<void> {
    this.assertPositiveId(userId, 'USER_ID_REQUIRED');
    this.assertPositiveId(seanceId, 'SEANCE_ID_REQUIRED');
    this.assertPositiveId(projectId, 'PROJECT_ID_REQUIRED');

    const rows = (await this.dataSource.query(
      `
        SELECT se.afficher_present
        FROM seance se
        INNER JOIN saison sa ON sa.id = se.saison_id
        WHERE se.seance_id = $1
          AND sa.project_id = $2
        LIMIT 1
      `,
      [seanceId, projectId],
    )) as SeanceRosterAccessRow[];

    const seance = rows[0];
    if (!seance) throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');

    if (await this.isProjectStaff(userId, projectId)) return;

    await this.assertAccountHasProjectContext(userId, projectId);
    if (!seance.afficher_present) {
      throw new ForbiddenException('SEANCE_ROSTER_NOT_VISIBLE');
    }
  }

  async assertDocumentAccess(
    userId: number,
    documentId: number,
    projectId?: number | null,
  ): Promise<void> {
    const rows = (await this.dataSource.query(
      `
        SELECT id, project_id, objet_type, objet_id
        FROM document
        WHERE id = $1
        LIMIT 1
      `,
      [documentId],
    )) as DocumentAccessRow[];

    const document = rows[0];
    if (!document) throw new NotFoundException('DOCUMENT_NOT_FOUND');

    const objectType = this.normalizeObjectType(document.objet_type);
    if (this.isPersonObjectType(objectType)) {
      if (
        document.project_id != null &&
        projectId != null &&
        Number(document.project_id) !== Number(projectId)
      ) {
        throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
      }

      await this.assertPersonAccess(userId, document.objet_id, projectId);
      return;
    }

    const pid = this.requireProjectId(projectId);
    if (
      document.project_id == null ||
      Number(document.project_id) !== Number(pid)
    ) {
      throw new ForbiddenException('RESOURCE_OUTSIDE_PROJECT');
    }

    await this.assertProjectAdmin(userId, pid);
  }

  async assertDocumentObjectAccess(
    userId: number,
    objectType: string,
    objectId: number,
    projectId?: number | null,
  ): Promise<void> {
    const pid = this.requireProjectId(projectId);

    if (this.isPersonObjectType(this.normalizeObjectType(objectType))) {
      const person = await this.getPerson(objectId);

      if (Number(person.compte) === Number(userId)) {
        await this.assertAccountHasProjectContext(userId, pid);
        return;
      }

      await this.assertProjectStaff(userId, pid);
      await this.assertAccountBelongsToProject(person.compte, pid);
      return;
    }

    await this.assertProjectAdmin(userId, pid);
  }

  private async isProjectStaff(userId: number, projectId: number): Promise<boolean> {
    const rows = await this.dataSource.query(
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
      [userId, projectId],
    );

    return rows.length > 0;
  }

  private async assertVisibleRosterPersonIds(
    ids: number[],
    projectId: number,
  ): Promise<void> {
    const rows = (await this.dataSource.query(
      `
        SELECT DISTINCT pe.id
        FROM personne pe
        WHERE pe.id = ANY($1::int[])
          AND EXISTS (
            SELECT 1
            FROM seance se
            INNER JOIN saison sa ON sa.id = se.saison_id
            WHERE sa.project_id = $2
              AND se.afficher_present = true
              AND (
                EXISTS (
                  SELECT 1
                  FROM inscription_seance ins
                  WHERE ins.seance_id = se.seance_id
                    AND ins.personne_id = pe.id
                )
                OR (
                  se.convocation_nominative = false
                  AND pe.archive = false
                  AND (se.age_minimum IS NULL OR EXTRACT(YEAR FROM age(CURRENT_DATE, pe.date_naissance)) >= se.age_minimum)
                  AND (se.age_maximum IS NULL OR EXTRACT(YEAR FROM age(CURRENT_DATE, pe.date_naissance)) <= se.age_maximum)
                  AND EXISTS (
                    SELECT 1
                    FROM lien_groupe lg_seance
                    INNER JOIN lien_groupe lg_rider
                      ON lg_rider.groupe_id = lg_seance.groupe_id
                    WHERE lg_seance.object_id = se.seance_id
                      AND LOWER(lg_seance.object_type) IN ('séance', 'seance')
                      AND LOWER(lg_rider.object_type) = 'rider'
                      AND lg_rider.object_id = pe.id
                  )
                )
              )
          )
      `,
      [ids, projectId],
    )) as Array<{ id: number }>;

    const allowed = new Set(rows.map((row) => Number(row.id)));
    if (ids.some((id) => !allowed.has(Number(id)))) {
      throw new ForbiddenException('RESOURCE_OUTSIDE_VISIBLE_SEANCE');
    }
  }

  private async getPerson(personId: number): Promise<PersonAccessRow> {
    this.assertPositiveId(personId, 'PERSON_ID_REQUIRED');
    const rows = (await this.dataSource.query(
      `SELECT id, compte FROM personne WHERE id = $1 LIMIT 1`,
      [personId],
    )) as PersonAccessRow[];

    const person = rows[0];
    if (!person) throw new NotFoundException('PERSON_NOT_FOUND');
    return person;
  }

  private requireProjectId(projectId?: number | null): number {
    const value = Number(projectId);
    if (!Number.isInteger(value) || value <= 0) {
      throw new ForbiddenException('PROJECT_ID_REQUIRED');
    }
    return value;
  }

  private cleanIds(rawIds: number[]): number[] {
    return [
      ...new Set(
        (rawIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private assertPositiveId(value: number, code: string): void {
    if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
      throw new ForbiddenException(code);
    }
  }

  private normalizeObjectType(value: string): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private isPersonObjectType(value: string): boolean {
    return ['member', 'rider', 'personne', 'person'].includes(value);
  }
}
