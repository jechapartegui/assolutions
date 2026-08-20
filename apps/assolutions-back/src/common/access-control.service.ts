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

  async assertAccountAccess(
    userId: number,
    accountId: number,
    projectId?: number | null,
  ): Promise<void> {
    this.assertPositiveId(accountId, 'ACCOUNT_ID_REQUIRED');

    if (Number(userId) === Number(accountId)) return;

    const pid = this.requireProjectId(projectId);
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
    await this.assertProjectAdmin(userId, pid);
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
    await this.assertProjectAdmin(userId, pid);

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

      await this.assertProjectAdmin(userId, pid);
      await this.assertAccountBelongsToProject(person.compte, pid);
      return;
    }

    await this.assertProjectAdmin(userId, pid);
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
