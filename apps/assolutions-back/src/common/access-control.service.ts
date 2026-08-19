import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { ProjectEntity } from '../project/project.entity';

export function readOptionalProjectId(req: any): number | null {
  const raw =
    req?.headers?.['x-project-id'] ??
    req?.headers?.['project-id'] ??
    req?.headers?.['projectid'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const projectId = Number(value);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

@Injectable()
export class AccessControlService {
  private static readonly MAX_BATCH_PERSONS = 500;

  constructor(private readonly ds: DataSource) {}

  async assertProjectAdmin(userId: number, projectId: number): Promise<ProjectEntity> {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    if (!Number.isInteger(Number(projectId)) || Number(projectId) <= 0) {
      throw new ForbiddenException('PROJECT_ID_REQUIRED');
    }

    const project = await this.ds.getRepository(ProjectEntity).findOne({
      where: { id: Number(projectId) },
    });
    if (!project) throw new ForbiddenException('PROJECT_NOT_FOUND');
    if (Number(project.compte) !== Number(userId)) {
      throw new ForbiddenException('NOT_PROJECT_ADMIN');
    }
    return project;
  }

  async assertAccountAccess(
    userId: number,
    targetCompteId: number,
    projectId?: number | null,
  ): Promise<void> {
    if (Number(targetCompteId) === Number(userId)) return;
    if (!projectId) throw new ForbiddenException('OBJECT_ACCESS_DENIED');

    await this.assertProjectAdmin(userId, projectId);
    const linked = await this.ds.getRepository(LoginProjectEntity).exist({
      where: {
        login_id: Number(targetCompteId),
        project_id: Number(projectId),
      },
    });
    if (!linked) throw new ForbiddenException('OBJECT_NOT_IN_PROJECT');
  }

  async getAuthorizedPerson(
    userId: number,
    personId: number,
    projectId?: number | null,
  ): Promise<PersonneEntity> {
    const item = await this.ds.getRepository(PersonneEntity).findOne({
      where: { id: Number(personId) },
    });
    if (!item) throw new NotFoundException(`personne ${personId} introuvable`);
    await this.assertAccountAccess(userId, item.compte, projectId);
    return item;
  }

  async assertPersonIdsAccess(
    userId: number,
    ids: number[],
    projectId?: number | null,
  ): Promise<PersonneEntity[]> {
    const cleanIds = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    if (!cleanIds.length) return [];
    if (cleanIds.length > AccessControlService.MAX_BATCH_PERSONS) {
      throw new ForbiddenException('TOO_MANY_OBJECTS');
    }

    const persons = await this.ds.getRepository(PersonneEntity).find({
      where: { id: In(cleanIds) },
    });
    if (persons.length !== cleanIds.length) {
      throw new NotFoundException('PERSON_NOT_FOUND');
    }

    const foreignAccountIds = [...new Set(
      persons
        .map((person) => Number(person.compte))
        .filter((compteId) => compteId !== Number(userId)),
    )];
    if (!foreignAccountIds.length) return persons;
    if (!projectId) throw new ForbiddenException('OBJECT_ACCESS_DENIED');

    await this.assertProjectAdmin(userId, projectId);
    const links = await this.ds.getRepository(LoginProjectEntity).find({
      where: {
        login_id: In(foreignAccountIds),
        project_id: Number(projectId),
      },
      select: { login_id: true },
    });
    const allowedAccounts = new Set(links.map((link) => Number(link.login_id)));
    if (foreignAccountIds.some((id) => !allowedAccounts.has(id))) {
      throw new ForbiddenException('OBJECT_NOT_IN_PROJECT');
    }
    return persons;
  }
}
