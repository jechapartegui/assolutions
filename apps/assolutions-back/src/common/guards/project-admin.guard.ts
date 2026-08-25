import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessControlService } from '../access-control.service';

@Injectable()
export class ProjectAdminGuard implements CanActivate {
  constructor(private readonly access: AccessControlService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = Number(req.user?.id);
    if (!userId) throw new UnauthorizedException('UNAUTHORIZED');

    const raw =
      req.headers['x-project-id'] ??
      req.headers['project-id'] ??
      req.headers['projectid'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const projectId = Number(value);

    await this.access.assertProjectAdmin(userId, projectId);
    req.projectId = projectId;
    return true;
  }
}
