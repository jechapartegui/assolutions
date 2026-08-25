import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Deux endpoints techniques utilisent leur propre preuve cryptographique :
    // le webhook HelloAsso et les photos temporaires de l'export FFRS.
    const req = context.switchToHttp().getRequest();
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    if (path === '/api/souscriptions/helloasso/webhook') return true;
    if (/^\/api\/personnes\/ffrs-photo\/\d+(?:\/[^/]+)?$/.test(path)) return true;

    return super.canActivate(context);
  }
}
