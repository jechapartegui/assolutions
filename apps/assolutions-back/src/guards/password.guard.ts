import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { generatePassword } from './password';

@Injectable()
export class PasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const route = request.route?.path;
console.warn('route', route);
    // ✅ Exclusion manuelle de certaines routes
    if (route === '/api/auth/login' || route === '/api/auth/prelogin' || route === '/api/auth/get_project/:id') {
      return true;
    }

    const headers = request.headers;
    const userId = headers['userid'];
    const projectId = headers['projectid'];
    const dateRef = headers['dateref']; // Attention : string, format YYYY-MM-DD
    const password = headers['password'];
    if (!userId || !projectId || !dateRef || !password) {
      throw new UnauthorizedException('NO HEADER');
    }

    const expectedPassword = generatePassword(userId, projectId, dateRef);

    if (password !== expectedPassword) {
      throw new UnauthorizedException('INVALID PASSWORD REQUEST');
    }

    return true;
  }
}
