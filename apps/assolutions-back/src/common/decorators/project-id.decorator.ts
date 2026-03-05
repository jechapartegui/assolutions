import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ProjectId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();

    // header names en lower-case dans Node
    const raw =
      req.headers['projectid'] ??
      req.headers['project-id'] ??
      req.headers['x-project-id'];

    const projectId = Number(raw);

    if (!projectId || Number.isNaN(projectId)) {
      throw new BadRequestException('Missing or invalid projectid header');
    }

    return projectId;
  },
);