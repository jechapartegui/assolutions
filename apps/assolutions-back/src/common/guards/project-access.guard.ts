import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  AccessControlService,
  readOptionalProjectId,
} from '../access-control.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly access: AccessControlService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const projectId = readOptionalProjectId(req);
    const project = await this.access.assertProjectAccess(
      Number(req.user?.id),
      Number(projectId),
    );

    req.projectId = project.id;
    req.project = project;
    return true;
  }
}
