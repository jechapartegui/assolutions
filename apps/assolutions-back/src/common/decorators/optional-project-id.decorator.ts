import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalProjectId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number | null => {
    const req = ctx.switchToHttp().getRequest();
    const raw =
      req.headers['projectid'] ??
      req.headers['project-id'] ??
      req.headers['x-project-id'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const projectId = Number(value);

    return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
  },
);
