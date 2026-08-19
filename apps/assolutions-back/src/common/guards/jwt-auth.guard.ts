import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

const PUBLIC_ROUTES = new Set([
  'POST /api/auth/login',
  'POST /api/auth/prelogin',
  'POST /api/auth/get_project',
  'POST /api/comptes/register-with-project',
  'POST /api/comptes/resend-activation',
  'POST /api/auth/check-reset-token',
  'POST /api/comptes/check-token',
  'POST /api/auth/set-password-with-token',
  'POST /api/auth/reinit_mdp',
  'POST /api/souscriptions/helloasso/webhook',
]);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method ?? '').toUpperCase();
    const path = String(req.originalUrl ?? req.url ?? '')
      .split('?')[0]
      .replace(/\/+$/, '');

    if (PUBLIC_ROUTES.has(`${method} ${path}`)) {
      return true;
    }

    return super.canActivate(context);
  }
}
