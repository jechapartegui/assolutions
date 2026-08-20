import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  LoginDto,
  LoginIdentifierDto,
  ResetTokenDto,
  SetPasswordWithTokenDto,
} from './auth.dto';
import { AuthService } from './auth.services';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('prelogin')
  prelogin(@Body() body: LoginIdentifierDto) {
    return this.auth.prelogin(body.login);
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.login, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-my-password')
  changeMyPassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.auth.changeMyPassword(req.user.id, body.newPassword);
  }

  @Public()
  @Post('reinit_mdp')
  reinitMdp(@Body() body: LoginIdentifierDto) {
    return this.auth.reinit_mdp(body.login);
  }

  @Public()
  @Post('check-reset-token')
  checkResetToken(@Body() body: ResetTokenDto) {
    return this.auth.checkResetToken(body.login, body.token);
  }

  @Public()
  @Post('set-password-with-token')
  setPasswordWithToken(@Body() body: SetPasswordWithTokenDto) {
    return this.auth.setPasswordWithToken(body.login, body.token, body.newPassword);
  }
}
