import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.services';

// src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('prelogin')
  async preLogin(@Body('email') email: string) {
    console.log('[preLogin] email reçu :', email); // 👈 pour vérifier l'appel
    return this.authService.prelogin(email);
  }

  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string }
  ) {
    return this.authService.validatepassword(email, password);
  }

  @Post('get_project')
  async get_project(
    @Body() { id }: { id: number },
    @Headers() headers: Record<string, string>
  ) {
    console.log('[get_project] headers reçus :', headers);
    return true;
  }
}