import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.services';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('prelogin')
  prelogin(@Body() body: { login: string }) {
    return this.auth.prelogin(body.login);
  }

  @Post('login')
  login(@Body() body: { login: string; password?: string }) {
    return this.auth.login(body.login, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-my-password')
  changeMyPassword(@Req() req: any, @Body() body: { newPassword: string | null }) {
    return this.auth.changeMyPassword(req.user.id, body.newPassword ?? null);
  }
@Post('reinit_mdp')
reinit_mdp(@Body() body: { login: string }) {
  return this.auth.reinit_mdp(body.login);
}

@Post('check-reset-token')
checkResetToken(@Body() body: { login: string; token: string }) {
  return this.auth.checkResetToken(body.login, body.token);
}

@Post('set-password-with-token')
setPasswordWithToken(
  @Body() body: { login: string; token: string; newPassword: string }
) {
  return this.auth.setPasswordWithToken(body.login, body.token, body.newPassword);
}
}
