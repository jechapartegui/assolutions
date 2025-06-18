import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.services';

// src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('prelogin')
  async preLogin(@Body('email') email: string) {
    return this.authService.prelogin(email);
  }

  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string }
  ) {
    return this.authService.validatepassword(email, password);
  }

  @Get('get_project/:id')
  async get_project(@Param('id') id: number) {
    
    return this.authService.getProjects(id);
  }
}