import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ProjectId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();
    return req.projectId;
  },
);
