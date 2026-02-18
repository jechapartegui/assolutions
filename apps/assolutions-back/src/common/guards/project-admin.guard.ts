import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjectEntity } from '../../project/project.entity';

@Injectable()
export class ProjectAdminGuard implements CanActivate {
  constructor(private readonly ds: DataSource) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('UNAUTHORIZED');

    const raw = req.headers['x-project-id'] ?? req.headers['projectid'];
    const projectId = parseInt(Array.isArray(raw) ? raw[0] : String(raw ?? ''), 10);
    if (!projectId) throw new ForbiddenException('PROJECT_ID_REQUIRED');

    const repo = this.ds.getRepository(ProjectEntity);
    const project = await repo.findOne({ where: { id: projectId } as any });
    if (!project) throw new ForbiddenException('PROJECT_NOT_FOUND');

    const ownerId =
      (project as any).compte_id ??
      (project as any).compteId ??
      (project as any).compte?.id ??
      (project as any).compte;

    if (ownerId !== userId) throw new ForbiddenException('NOT_PROJECT_ADMIN');

    return true;
  }
}
