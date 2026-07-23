import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const url: string = req.url;

    // 👉 On laisse passer TOUT ce qui est auth "public"
    if (
      url.startsWith('/api/auth/login') ||
      url.startsWith('/api/auth/prelogin') ||
      url.startsWith('/api/auth/get_project') ||
      url.startsWith('/api/comptes/register-with-project') ||
      url.startsWith('/api/auth/check-reset-token') ||
      url.startsWith('/api/comptes/check-token') ||
      url.startsWith('/api/auth/set-password-with-token') ||
      url.startsWith('/api/auth/reinit_mdp')
    ) {
      console.log('JwtAuthGuard SKIP for', url);
      return true;
    }

    return super.canActivate(context);
  }
}
